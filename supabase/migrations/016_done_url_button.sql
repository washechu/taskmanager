-- м.016 — кнопка «📋 Открыть задачу» в пуше о выполнении партнёром.
--
-- Расширяем _send_telegram опциональным reply_markup (default null →
-- старые вызовы продолжают работать) и обновляем _notify_partner_done,
-- чтобы он передавал клавиатуру с URL-кнопкой к самой задаче.
--
-- Зависит от м.010 (_send_telegram), м.012 (app_url), м.014
-- (_notify_partner_done с веткой делегирования).

-- ─── 1. _send_telegram теперь умеет в reply_markup ──────────────────
create or replace function _send_telegram(
  p_chat_id      bigint,
  p_text         text,
  p_assignee     text,
  p_kind         text,
  p_reply_markup jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  bot_token  text;
  request_id bigint;
  payload    jsonb;
begin
  select value into bot_token from app_settings where key = 'telegram_bot_token';

  if bot_token is null then
    insert into telegram_log(assignee, kind, ok, error)
    values (p_assignee, p_kind, false, 'telegram_bot_token не задан в app_settings');
    return;
  end if;

  payload := jsonb_build_object(
    'chat_id', p_chat_id,
    'text', p_text,
    'parse_mode', 'HTML'
  );
  if p_reply_markup is not null then
    payload := payload || jsonb_build_object('reply_markup', p_reply_markup);
  end if;

  select net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := payload,
    timeout_milliseconds := 15000
  ) into request_id;

  insert into telegram_log(assignee, kind, ok, error)
  values (p_assignee, p_kind, true, 'pg_net request ' || request_id);
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (p_assignee, p_kind, false, sqlerrm);
end;
$$;

-- ─── 2. _notify_partner_done — добавляем URL-кнопку ─────────────────
-- Логика та же, что в м.014 (две ветки: общая задача + делегирование),
-- но в каждом пуше прикладываем клавиатуру с кнопкой к самой задаче.
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
  app_url        text;
  task_kbd       jsonb;
begin
  if OLD.status = 'done' or NEW.status <> 'done' then return NEW; end if;
  if NEW.category <> 'family' then return NEW; end if;

  actor := _actor();
  if actor is null then return NEW; end if;
  actor_name := _display_name(actor);

  -- Готовим клавиатуру один раз: если есть app_url — кнопка на задачу
  select value into app_url from app_settings where key = 'app_url';
  if app_url is not null then
    task_kbd := jsonb_build_object(
      'inline_keyboard', jsonb_build_array(jsonb_build_array(
        jsonb_build_object('text', '📋 Открыть задачу',
                           'url',  app_url || '/tasks?open=' || NEW.id)
      ))
    );
  end if;

  -- Ветка A: классическая общая (assignees ≥ 2)
  if cardinality(NEW.assignees) >= 2 then
    for recipient in select a from unnest(NEW.assignees) a where a <> actor loop
      recipient_chat := _chat_id_of(recipient);
      if recipient_chat is null then continue; end if;
      body := '✔️ <b>' || actor_name || '</b> закрыл' ||
              case actor when 'galya' then 'а' else '' end ||
              ' общую задачу' || E'\n\n<b>' || _html_escape(NEW.title) || '</b>';
      perform _send_telegram(recipient_chat, body, recipient, 'done', task_kbd);
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
    perform _send_telegram(recipient_chat, body, NEW.invited_by, 'done', task_kbd);
  end if;

  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'done', false, sqlerrm);
  return NEW;
end;
$$;
