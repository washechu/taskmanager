-- м.013 — вторая доработка приглашений:
--   • URL-кнопка «📋 Открыть задачу» в пуше об ответе (invite_replied)
--   • Бамп таймаута pg_net до 15 секунд (дефолтные 5 сек иногда лопаются)
--
-- Зависит от м.010 (_send_telegram) и м.011 (_notify_invite_replied).

-- ─── 1. Бамп таймаута в _send_telegram ──────────────────────────────
-- Telegram API при холодном старте/сетевых задержках иногда отвечает
-- 6-10 сек; дефолтный таймаут pg_net (5000 мс) лопался на одном из
-- пушей. 15 секунд хватит на любой разумный лаг.
create or replace function _send_telegram(
  p_chat_id   bigint,
  p_text      text,
  p_assignee  text,
  p_kind      text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  bot_token text;
  request_id bigint;
begin
  select value into bot_token from app_settings where key = 'telegram_bot_token';

  if bot_token is null then
    insert into telegram_log(assignee, kind, ok, error)
    values (p_assignee, p_kind, false, 'telegram_bot_token не задан в app_settings');
    return;
  end if;

  select net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'chat_id', p_chat_id,
      'text', p_text,
      'parse_mode', 'HTML'
    ),
    timeout_milliseconds := 15000
  ) into request_id;

  insert into telegram_log(assignee, kind, ok, error)
  values (p_assignee, p_kind, true, 'pg_net request ' || request_id);
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (p_assignee, p_kind, false, sqlerrm);
end;
$$;

-- ─── 2. URL-кнопка в пуше invite_replied ────────────────────────────
-- Раньше функция отправляла plain-текст через _send_telegram. Чтобы
-- прикрепить inline-кнопку, вызываем net.http_post напрямую (как это
-- делает _notify_invite_sent в м.012).
create or replace function _notify_invite_replied()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  inviter_chat  bigint;
  actor         text;
  actor_name    text;
  verdict       text;
  body          text;
  kbd           jsonb;
  bot_token     text;
  app_url       text;
  task_url      text;
  request_id    bigint;
begin
  -- Только переход из pending в финальный статус
  if OLD.invite_status <> 'pending' then return NEW; end if;
  if NEW.invite_status not in ('accepted', 'tentative', 'declined', 'none') then return NEW; end if;
  if NEW.invited_by is null then return NEW; end if;

  inviter_chat := _chat_id_of(NEW.invited_by);
  if inviter_chat is null then return NEW; end if;

  -- Кто ответил — второй участник из OLD.assignees
  select a into actor
  from unnest(OLD.assignees) a
  where a <> NEW.invited_by
  limit 1;
  if actor is null then return NEW; end if;
  actor_name := _display_name(actor);

  -- 'none' в данном переходе = decline (см. respond_to_invite_rpc)
  verdict := case
    when NEW.invite_status = 'accepted'  then '✅ <b>' || actor_name || '</b> принял твоё предложение'
    when NEW.invite_status = 'tentative' then '🤔 <b>' || actor_name || '</b> ответил: думаю'
    when NEW.invite_status = 'declined' or NEW.invite_status = 'none'
                                         then '❌ <b>' || actor_name || '</b> отклонил твоё предложение'
    else null
  end;
  if verdict is null then return NEW; end if;

  body := verdict || E'\n\n<b>' || _html_escape(NEW.title) || '</b>';

  select value into bot_token from app_settings where key = 'telegram_bot_token';
  if bot_token is null then
    insert into telegram_log(assignee, kind, ok, error)
    values (NEW.invited_by, 'invite_reply', false, 'telegram_bot_token не задан');
    return NEW;
  end if;

  -- Если знаем app_url — прикладываем кнопку. Если нет — отправляем как раньше.
  select value into app_url from app_settings where key = 'app_url';
  if app_url is not null then
    task_url := app_url || '/tasks?open=' || NEW.id;
    kbd := jsonb_build_object(
      'inline_keyboard', jsonb_build_array(jsonb_build_array(
        jsonb_build_object('text', '📋 Открыть задачу', 'url', task_url)
      ))
    );

    select net.http_post(
      url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'chat_id', inviter_chat,
        'text', body,
        'parse_mode', 'HTML',
        'reply_markup', kbd
      ),
      timeout_milliseconds := 15000
    ) into request_id;
  else
    select net.http_post(
      url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'chat_id', inviter_chat,
        'text', body,
        'parse_mode', 'HTML'
      ),
      timeout_milliseconds := 15000
    ) into request_id;
  end if;

  insert into telegram_log(assignee, kind, ok, error)
  values (NEW.invited_by, 'invite_reply', true, 'pg_net request ' || request_id);
  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'invite_reply', false, sqlerrm);
  return NEW;
end;
$$;
