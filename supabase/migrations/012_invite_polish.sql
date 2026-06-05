-- м.012 — доработка пуша приглашения:
--   • Кнопка «Открыть задачу» (URL-кнопка → откроется в PWA через deeplink)
--   • Audit-коммент «Создано предложение» при автогенерации pending
--
-- Базовый URL берётся из app_settings.key='app_url'. Если не задан —
-- кнопки нет (но audit-коммент всё равно пишется и Принять/Думаю/Отклонить
-- работают как раньше).

-- На случай если app_url ещё не вставлен — добавим дефолт сразу.
insert into app_settings(key, value) values
  ('app_url', 'https://taskmanager-sooty-phi-79.vercel.app')
on conflict (key) do nothing;

-- Обновляем _notify_invite_sent: добавляем web-кнопку + audit-коммент.
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
  app_url         text;
  task_url        text;
begin
  if NEW.invite_status <> 'pending' or NEW.invited_by is null then return NEW; end if;

  -- Второй участник (не приглашающий)
  select a into target_assignee
  from unnest(NEW.assignees) a
  where a <> NEW.invited_by
  limit 1;

  if target_assignee is null then return NEW; end if;

  target_chat := _chat_id_of(target_assignee);

  -- Audit-коммент «Создано предложение» — пишется всегда, даже если
  -- у второго участника нет привязки в Telegram (он увидит в UI).
  insert into comments(task_id, kind, author, text)
  values (NEW.id, 'audit', NEW.invited_by, 'Создано предложение');

  if target_chat is null then return NEW; end if;

  inviter_name := _display_name(NEW.invited_by);
  body := '👋 <b>' || inviter_name || '</b> предложил тебе задачу' || E'\n\n' ||
          '<b>' || _html_escape(NEW.title) || '</b>';
  if NEW.due_date is not null then
    body := body || E'\n📅 Дедлайн: ' || NEW.due_date;
  end if;
  if NEW.description is not null and length(trim(NEW.description)) > 0 then
    body := body || E'\n\n<i>' || _html_escape(NEW.description) || '</i>';
  end if;

  -- Базовая клавиатура: 3 кнопки ответа в первом ряду.
  kbd := jsonb_build_object(
    'inline_keyboard', jsonb_build_array(jsonb_build_array(
      jsonb_build_object('text', '✅ Принять',  'callback_data', 'invite:' || NEW.id || ':accept'),
      jsonb_build_object('text', '🤔 Думаю',   'callback_data', 'invite:' || NEW.id || ':tentative'),
      jsonb_build_object('text', '❌ Отклонить', 'callback_data', 'invite:' || NEW.id || ':decline')
    ))
  );

  -- Если знаем URL приложения — добавляем второй ряд с кнопкой «Открыть».
  select value into app_url from app_settings where key = 'app_url';
  if app_url is not null then
    task_url := app_url || '/tasks?open=' || NEW.id;
    kbd := jsonb_set(
      kbd, '{inline_keyboard}',
      (kbd -> 'inline_keyboard') ||
        jsonb_build_array(jsonb_build_array(
          jsonb_build_object('text', '📋 Открыть задачу', 'url', task_url)
        ))
    );
  end if;

  select value into bot_token from app_settings where key = 'telegram_bot_token';
  if bot_token is null then return NEW; end if;

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'chat_id', target_chat,
      'text', body,
      'parse_mode', 'HTML',
      'reply_markup', kbd
    )
  );

  insert into telegram_log(assignee, kind, ok, error)
  values (target_assignee, 'invite', true, 'queued');

  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'invite', false, sqlerrm);
  return NEW;
end;
$$;
