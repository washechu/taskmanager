-- м.021 — убираем URL-кнопки «📋 Открыть задачу» из пушей бота.
--
-- Причина та же, что и для дайджеста (м.019): переход по ссылке открывается
-- во встроенном webview Telegram без сессии Supabase — каждый раз требует
-- повторного логина. Кнопки бесполезны.
--
-- Callback-кнопки приглашения (✅🤔❌) работают ВНУТРИ Telegram (не открывают
-- браузер) — их оставляем.
--
-- Затрагивает 3 функции:
--   • _notify_invite_sent   (м.017) — оставляем callback-ряд, убираем URL-ряд
--   • _notify_invite_replied(м.013) — был только URL → шлём plain-текст
--   • _notify_partner_done  (м.016) — был только URL → шлём без reply_markup
--
-- Зависит от м.018 (одна сигнатура _send_telegram с reply_markup default null).

-- ─── 1. invite_sent: только callback-кнопки, без «Открыть задачу» ────
create or replace function _notify_invite_sent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  target_assignee text;
  target_chat     bigint;
  inviter_name    text;
  body            text;
  kbd             jsonb;
  bot_token       text;
  request_id      bigint;
begin
  if NEW.invite_status <> 'pending' or NEW.invited_by is null then return NEW; end if;

  select a into target_assignee
  from unnest(NEW.assignees) a
  where a <> NEW.invited_by
  limit 1;

  if target_assignee is null then return NEW; end if;

  target_chat := _chat_id_of(target_assignee);

  insert into comments(task_id, kind, author, text)
  values (NEW.id, 'audit', NEW.invited_by, 'Создано предложение');

  if target_chat is null then return NEW; end if;

  inviter_name := _display_name(NEW.invited_by);
  body := '👋 <b>' || inviter_name || '</b> предложил' ||
          case NEW.invited_by when 'galya' then 'а' else '' end ||
          ' тебе задачу' || E'\n\n' ||
          '<b>' || _html_escape(NEW.title) || '</b>';
  if NEW.due_date is not null then
    body := body || E'\n📅 Дедлайн: ' || NEW.due_date;
  end if;
  if NEW.description is not null and length(trim(NEW.description)) > 0 then
    body := body || E'\n\n<i>' || _html_escape(NEW.description) || '</i>';
  end if;

  -- Только эмодзи-кнопки ответа (callback, работают внутри Telegram).
  kbd := jsonb_build_object(
    'inline_keyboard', jsonb_build_array(jsonb_build_array(
      jsonb_build_object('text', '✅', 'callback_data', 'invite:' || NEW.id || ':accept'),
      jsonb_build_object('text', '🤔', 'callback_data', 'invite:' || NEW.id || ':tentative'),
      jsonb_build_object('text', '❌', 'callback_data', 'invite:' || NEW.id || ':decline')
    ))
  );

  select value into bot_token from app_settings where key = 'telegram_bot_token';
  if bot_token is null then return NEW; end if;

  select net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'chat_id', target_chat,
      'text', body,
      'parse_mode', 'HTML',
      'reply_markup', kbd
    ),
    timeout_milliseconds := 15000
  ) into request_id;

  insert into telegram_log(assignee, kind, ok, error)
  values (target_assignee, 'invite', true, 'pg_net request ' || request_id);

  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'invite', false, sqlerrm);
  return NEW;
end;
$$;

-- ─── 2. invite_replied: plain-текст, без кнопки ─────────────────────
create or replace function _notify_invite_replied()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  inviter_chat bigint;
  actor        text;
  actor_name   text;
  verdict      text;
  body         text;
begin
  if OLD.invite_status <> 'pending' then return NEW; end if;
  if NEW.invite_status not in ('accepted', 'tentative', 'declined', 'none') then return NEW; end if;
  if NEW.invited_by is null then return NEW; end if;

  inviter_chat := _chat_id_of(NEW.invited_by);
  if inviter_chat is null then return NEW; end if;

  select a into actor
  from unnest(OLD.assignees) a
  where a <> NEW.invited_by
  limit 1;
  if actor is null then return NEW; end if;
  actor_name := _display_name(actor);

  verdict := case
    when NEW.invite_status = 'accepted'  then '✅ <b>' || actor_name || '</b> принял твоё предложение'
    when NEW.invite_status = 'tentative' then '🤔 <b>' || actor_name || '</b> ответил: думаю'
    when NEW.invite_status = 'declined' or NEW.invite_status = 'none'
                                         then '❌ <b>' || actor_name || '</b> отклонил твоё предложение'
    else null
  end;
  if verdict is null then return NEW; end if;

  body := verdict || E'\n\n<b>' || _html_escape(NEW.title) || '</b>';

  perform _send_telegram(inviter_chat, body, NEW.invited_by, 'invite_reply');
  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'invite_reply', false, sqlerrm);
  return NEW;
end;
$$;

-- ─── 3. partner_done: без кнопки ────────────────────────────────────
create or replace function _notify_partner_done()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  actor          text;
  actor_name     text;
  recipient      text;
  recipient_chat bigint;
  body           text;
begin
  if OLD.status = 'done' or NEW.status <> 'done' then return NEW; end if;
  if NEW.category <> 'family' then return NEW; end if;

  actor := _actor();
  if actor is null then return NEW; end if;
  actor_name := _display_name(actor);

  -- Ветка A: классическая общая (assignees ≥ 2)
  if cardinality(NEW.assignees) >= 2 then
    for recipient in select a from unnest(NEW.assignees) a where a <> actor loop
      recipient_chat := _chat_id_of(recipient);
      if recipient_chat is null then continue; end if;
      body := '✔️ <b>' || actor_name || '</b> закрыл' ||
              case actor when 'galya' then 'а' else '' end ||
              ' общую задачу' || E'\n\n<b>' || _html_escape(NEW.title) || '</b>';
      perform _send_telegram(recipient_chat, body, recipient, 'done');
    end loop;
    return NEW;
  end if;

  -- Ветка B: делегирование (assignees=1, исполнитель закрыл — пуш инициатору)
  if cardinality(NEW.assignees) = 1
     and NEW.invited_by is not null
     and NEW.invited_by <> actor
     and actor = NEW.assignees[1] then
    recipient_chat := _chat_id_of(NEW.invited_by);
    if recipient_chat is null then return NEW; end if;
    body := '✔️ <b>' || actor_name || '</b> закрыл' ||
            case actor when 'galya' then 'а' else '' end ||
            ' задачу, которую ты делегировал' ||
            case NEW.invited_by when 'galya' then 'а' else '' end ||
            E'\n\n<b>' || _html_escape(NEW.title) || '</b>';
    perform _send_telegram(recipient_chat, body, NEW.invited_by, 'done');
  end if;

  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'done', false, sqlerrm);
  return NEW;
end;
$$;
