-- м.011 — Telegram-уведомления, фаза γ: события + расширение вечернего дайджеста.
--
-- Перед применением — в app_settings должны быть email'ы пользователей:
--   insert into app_settings(key, value) values
--     ('nick_email',  'avadakedavra921129@gmail.com'),
--     ('galya_email', 'email_галочки@example.com')
--   on conflict (key) do update set value = excluded.value, updated_at = now();
--
-- Без email'ов триггеры не смогут определить актора PWA-операций и
-- молча скипнут уведомления — никаких падений, просто тихо.

-- ─── Хелпер: кто сейчас выполняет операцию ──────────────────────────
-- Возвращает 'nick' / 'galya' / null.
-- Источники по приоритету:
--   1. current_setting('app.actor', true) — выставляется webhook'ом перед
--      обновлением через RPC respond_to_invite_rpc()
--   2. auth.email() — email из JWT (для PWA-запросов с авторизацией)
--      сравнивается с nick_email / galya_email в app_settings
create or replace function _actor()
returns text
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  forced       text;
  jwt_email    text;
  nick_email   text;
  galya_email  text;
begin
  forced := nullif(current_setting('app.actor', true), '');
  if forced is not null then return forced; end if;

  begin
    jwt_email := auth.email();
  exception when others then
    jwt_email := null;
  end;
  if jwt_email is null then return null; end if;

  select value into nick_email  from app_settings where key = 'nick_email';
  select value into galya_email from app_settings where key = 'galya_email';
  if jwt_email = nick_email  then return 'nick';  end if;
  if jwt_email = galya_email then return 'galya'; end if;
  return null;
end;
$$;

-- ─── Хелпер: имя для UI ─────────────────────────────────────────────
create or replace function _display_name(a text) returns text
language sql immutable as $$
  select case a when 'nick' then 'Никита' when 'galya' then 'Галочка' else a end;
$$;

-- ─── Хелпер: chat_id по assignee ────────────────────────────────────
create or replace function _chat_id_of(a text) returns bigint
language sql security definer as $$
  select chat_id from telegram_links where assignee = a limit 1;
$$;

-- ─── HTML-escape для безопасной вставки в Telegram-сообщения ────────
create or replace function _html_escape(s text) returns text
language sql immutable as $$
  select replace(replace(replace(coalesce(s, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

-- ─── Auto-set invite при создании семейной задачи с двумя участниками
create or replace function _auto_set_invite()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
begin
  if NEW.category = 'family'
     and cardinality(NEW.assignees) = 2
     and coalesce(NEW.invite_status, 'none') = 'none'
     and NEW.invited_by is null then
    NEW.invited_by   := _actor();
    if NEW.invited_by is not null then
      NEW.invite_status := 'pending';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_auto_invite on tasks;
create trigger trg_auto_invite
  before insert on tasks
  for each row execute function _auto_set_invite();

-- ─── Событие 1: новое предложение → уведомить второго участника ─────
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
begin
  if NEW.invite_status <> 'pending' or NEW.invited_by is null then return NEW; end if;

  -- Второй участник (не приглашающий)
  select a into target_assignee
  from unnest(NEW.assignees) a
  where a <> NEW.invited_by
  limit 1;

  if target_assignee is null then return NEW; end if;

  target_chat := _chat_id_of(target_assignee);
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

  kbd := jsonb_build_object(
    'inline_keyboard', jsonb_build_array(jsonb_build_array(
      jsonb_build_object('text', '✅ Принять',  'callback_data', 'invite:' || NEW.id || ':accept'),
      jsonb_build_object('text', '🤔 Думаю',   'callback_data', 'invite:' || NEW.id || ':tentative'),
      jsonb_build_object('text', '❌ Отклонить', 'callback_data', 'invite:' || NEW.id || ':decline')
    ))
  );

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

drop trigger if exists trg_notify_invite_sent on tasks;
create trigger trg_notify_invite_sent
  after insert on tasks
  for each row when (NEW.invite_status = 'pending')
  execute function _notify_invite_sent();

-- ─── Событие 2: ответ на предложение → уведомить инициатора ─────────
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

  perform _send_telegram(inviter_chat, body, NEW.invited_by, 'invite_reply');
  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'invite_reply', false, sqlerrm);
  return NEW;
end;
$$;

drop trigger if exists trg_notify_invite_replied on tasks;
create trigger trg_notify_invite_replied
  after update of invite_status on tasks
  for each row when (OLD.invite_status is distinct from NEW.invite_status)
  execute function _notify_invite_replied();

-- ─── Событие 3: партнёр выполнил общую задачу ───────────────────────
create or replace function _notify_partner_done()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  actor         text;
  actor_name    text;
  recipient     text;
  recipient_chat bigint;
  body          text;
begin
  -- Только переход в done
  if OLD.status = 'done' or NEW.status <> 'done' then return NEW; end if;
  -- Только семейная с ≥2 участниками
  if NEW.category <> 'family' or cardinality(NEW.assignees) < 2 then return NEW; end if;

  actor := _actor();
  if actor is null then
    -- Без актора не можем понять кого исключать — скипаем, чтобы не спамить
    return NEW;
  end if;
  actor_name := _display_name(actor);

  -- Уведомить всех участников кроме актора
  for recipient in select a from unnest(NEW.assignees) a where a <> actor loop
    recipient_chat := _chat_id_of(recipient);
    if recipient_chat is null then continue; end if;
    body := '✔️ <b>' || actor_name || '</b> закрыл' ||
            case actor when 'galya' then 'а' else '' end ||
            ' общую задачу' || E'\n\n<b>' || _html_escape(NEW.title) || '</b>';
    perform _send_telegram(recipient_chat, body, recipient, 'done');
  end loop;
  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'done', false, sqlerrm);
  return NEW;
end;
$$;

drop trigger if exists trg_notify_partner_done on tasks;
create trigger trg_notify_partner_done
  after update of status on tasks
  for each row when (NEW.status = 'done' and OLD.status is distinct from NEW.status)
  execute function _notify_partner_done();

-- ─── Событие 4: новый user-комментарий → уведомить других участников
create or replace function _notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  task_row     tasks%rowtype;
  recipient    text;
  recipient_chat bigint;
  actor_name   text;
  body         text;
begin
  if NEW.kind <> 'user' then return NEW; end if;

  select * into task_row from tasks where id = NEW.task_id;
  if task_row.id is null then return NEW; end if;

  actor_name := _display_name(NEW.author);

  for recipient in select a from unnest(task_row.assignees) a where a <> NEW.author loop
    recipient_chat := _chat_id_of(recipient);
    if recipient_chat is null then continue; end if;
    body := '💬 <b>' || actor_name || '</b> прокомментировал' ||
            case NEW.author when 'galya' then 'а' else '' end ||
            ' задачу' || E'\n\n<b>' || _html_escape(task_row.title) || '</b>' ||
            E'\n\n<i>«' || _html_escape(NEW.text) || '»</i>';
    perform _send_telegram(recipient_chat, body, recipient, 'comment');
  end loop;
  return NEW;
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (NULL, 'comment', false, sqlerrm);
  return NEW;
end;
$$;

drop trigger if exists trg_notify_new_comment on comments;
create trigger trg_notify_new_comment
  after insert on comments
  for each row execute function _notify_new_comment();

-- ─── RPC для webhook'a: ответ на предложение из Telegram-кнопок ─────
-- Webhook вызывает с явным p_actor (определённым из chat_id). Функция
-- выставляет app.actor, чтобы триггеры в этой транзакции знали кто кликнул.
create or replace function respond_to_invite_rpc(
  p_task_id  uuid,
  p_response text,
  p_actor    text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  task_row tasks%rowtype;
  new_assignees text[];
  audit_text text;
begin
  if p_actor not in ('nick', 'galya') then
    return jsonb_build_object('ok', false, 'error', 'invalid actor');
  end if;
  if p_response not in ('accept', 'tentative', 'decline') then
    return jsonb_build_object('ok', false, 'error', 'invalid response');
  end if;

  perform set_config('app.actor', p_actor, true);

  select * into task_row from tasks where id = p_task_id;
  if task_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'task not found');
  end if;
  if task_row.invite_status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'not pending', 'status', task_row.invite_status);
  end if;
  if task_row.invited_by = p_actor then
    return jsonb_build_object('ok', false, 'error', 'cannot respond to own invitation');
  end if;
  if not (p_actor = any(task_row.assignees)) then
    return jsonb_build_object('ok', false, 'error', 'not invited');
  end if;

  if p_response = 'accept' then
    update tasks set invite_status = 'accepted', updated_at = now() where id = p_task_id;
    audit_text := 'Принял предложение';
  elsif p_response = 'tentative' then
    update tasks set invite_status = 'tentative', updated_at = now() where id = p_task_id;
    audit_text := 'Сказал: думаю';
  else  -- decline
    new_assignees := array[task_row.invited_by]::text[];
    update tasks set invite_status = 'none', assignees = new_assignees, updated_at = now()
    where id = p_task_id;
    audit_text := 'Отклонил предложение';
  end if;

  insert into comments(task_id, kind, author, text)
  values (p_task_id, 'audit', p_actor, audit_text);

  return jsonb_build_object('ok', true, 'response', p_response);
end;
$$;

-- ─── Вечерний дайджест: переименовываем + добавляем задачи ──────────
-- Старая функция называлась send_evening_habits. Заменяем на
-- send_evening_digest, шлющую и привычки, и задачи.
create or replace function send_evening_digest()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  link            record;
  today           date := current_date;
  overdue_count   int;
  today_tasks_text text;
  habits_text     text;
  body            text;
  display_name    text;
begin
  for link in select assignee, chat_id from telegram_links loop
    display_name := case link.assignee when 'nick' then 'Никита' else 'Галочка' end;

    -- Просрочка
    select count(*) into overdue_count
    from tasks
    where status != 'done'
      and due_date is not null
      and due_date < today
      and (link.assignee = any(assignees) or (assignees = '{}' and category = 'personal'));

    -- Незакрытые задачи на сегодня (top 10 по приоритету)
    select string_agg(
      '   • ' ||
        case priority when 'high' then '<b>Высокий</b>'
                      when 'low'  then 'Низкий'
                      else 'Средний' end
        || ' — ' || _html_escape(title),
      E'\n'
      order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, title
    ) into today_tasks_text
    from (
      select priority, title
      from tasks
      where status != 'done'
        and due_date = today
        and (link.assignee = any(assignees) or (assignees = '{}' and category = 'personal'))
      order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, title
      limit 10
    ) t;

    -- Незакрытые привычки на сегодня
    select string_agg('   • ' || _html_escape(title), E'\n' order by title)
    into habits_text
    from habits h
    where h.assignee = link.assignee
      and h.archived = false
      and (
        h.schedule_type = 'daily'
        or (h.schedule_type = 'weekdays' and extract(isodow from today)::int = any(h.weekdays))
        or (h.schedule_type = 'monthdays' and extract(day from today)::int = any(h.monthdays))
      )
      and not exists (select 1 from habit_logs l where l.habit_id = h.id and l.date = today);

    -- Skip если на вечер делать нечего
    if overdue_count = 0 and today_tasks_text is null and habits_text is null then
      continue;
    end if;

    body := '🌙 ' || display_name || ', вечер пришёл — что осталось:';
    if overdue_count > 0 then
      body := body || E'\n\n🔥 Просрочено: <b>' || overdue_count || '</b>';
    end if;
    if today_tasks_text is not null then
      body := body || E'\n\n⚠️ Задачи на сегодня:\n' || today_tasks_text;
    end if;
    if habits_text is not null then
      body := body || E'\n\n🔁 Привычки:\n' || habits_text;
    end if;
    body := body || E'\n\n<i>День ещё не закончился — успеешь.</i>';

    perform _send_telegram(link.chat_id, body, link.assignee, 'evening');
  end loop;
end;
$$;

-- ─── Cron: переключаем вечерний на новую функцию ────────────────────
do $$
begin
  if exists (select 1 from cron.job where jobname = 'tg_evening_habits') then
    perform cron.unschedule('tg_evening_habits');
  end if;
  if exists (select 1 from cron.job where jobname = 'tg_evening_digest') then
    perform cron.unschedule('tg_evening_digest');
  end if;
end $$;

select cron.schedule('tg_evening_digest', '0 18 * * *', $$select public.send_evening_digest()$$);

-- Старая send_evening_habits можно оставить как есть (другая функция,
-- никто её больше не зовёт). Не дропаем, чтобы не ломать ничего вдруг.
