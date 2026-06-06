-- м.017 — убираем подписи у кнопок ответа в пуше приглашения.
--
-- Раньше: «✅ Принять», «🤔 Думаю», «❌ Отклонить».
-- Стало: «✅», «🤔», «❌» — консистентно с UI задачи (там после м.13–15 тоже
-- эмодзи-кнопки без подписей).
--
-- URL-кнопку «📋 Открыть задачу» оставляем как есть — это не callback, а
-- ссылка, ей подпись нужна для read-affordance.
--
-- Зависит от м.015 (последняя версия _notify_invite_sent).

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

  -- Эмодзи-кнопки без подписи в одном ряду
  kbd := jsonb_build_object(
    'inline_keyboard', jsonb_build_array(jsonb_build_array(
      jsonb_build_object('text', '✅', 'callback_data', 'invite:' || NEW.id || ':accept'),
      jsonb_build_object('text', '🤔', 'callback_data', 'invite:' || NEW.id || ':tentative'),
      jsonb_build_object('text', '❌', 'callback_data', 'invite:' || NEW.id || ':decline')
    ))
  );

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
