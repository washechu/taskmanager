-- м.010 — Telegram-уведомления, фаза β: расписание.
--
-- Утренний дайджест (08:00 МСК = 05:00 UTC) — просрочка + задачи дня + привычки.
-- Вечернее напоминание (21:00 МСК = 18:00 UTC) — только неотмеченные привычки.
--
-- Перед применением миграции в Dashboard → Database → Extensions включить:
--   • pg_cron — планировщик
--   • pg_net  — HTTP-клиент для исходящих запросов к Telegram
--
-- После миграции — INSERT токен бота в app_settings:
--   insert into app_settings (key, value) values ('telegram_bot_token', '<TOKEN>');

-- ─── Конфиг ─────────────────────────────────────────────────────────
-- Хранилище секретов для SQL-функций. RLS deny-all: клиенту недоступно.
create table if not exists app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

alter table app_settings enable row level security;
-- Никаких политик — только service_role.

-- ─── Расширения ─────────────────────────────────────────────────────
-- На Supabase должны быть предварительно включены через Dashboard.
-- Дублируем здесь для идемпотентности и понятной ошибки если выключены.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ─── Helper: отправка сообщения в Telegram ──────────────────────────
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

  -- pg_net.http_post — асинхронный: возвращает request_id, тело ответа
  -- придёт в net._http_response позже. Для нашего лога считаем «отправлено»
  -- если запрос успешно поставлен в очередь.
  select net.http_post(
    url := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'chat_id', p_chat_id,
      'text', p_text,
      'parse_mode', 'HTML'
    )
  ) into request_id;

  insert into telegram_log(assignee, kind, ok, error)
  values (p_assignee, p_kind, true, 'pg_net request ' || request_id);
exception when others then
  insert into telegram_log(assignee, kind, ok, error)
  values (p_assignee, p_kind, false, sqlerrm);
end;
$$;

-- ─── Утренний дайджест ──────────────────────────────────────────────
create or replace function send_morning_digest()
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

    -- Просрочка: due_date < today, не done, я ответственный (либо loose-personal).
    select count(*) into overdue_count
    from tasks
    where status != 'done'
      and due_date is not null
      and due_date < today
      and (
        link.assignee = any(assignees)
        or (assignees = '{}' and category = 'personal')
      );

    -- Задачи на сегодня (до 10, по приоритету high→low → название).
    select string_agg(
      '   • ' ||
        case priority when 'high' then '<b>Высокий</b>'
                      when 'low'  then 'Низкий'
                      else 'Средний' end
        || ' — ' || title,
      E'\n'
      order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, title
    ) into today_tasks_text
    from (
      select priority, title
      from tasks
      where status != 'done'
        and due_date = today
        and (
          link.assignee = any(assignees)
          or (assignees = '{}' and category = 'personal')
        )
      order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, title
      limit 10
    ) t;

    -- Привычки на сегодня — только мои, активные, запланированные и неотмеченные.
    select string_agg('   • ' || title, E'\n' order by title) into habits_text
    from habits h
    where h.assignee = link.assignee
      and h.archived = false
      and (
        h.schedule_type = 'daily'
        or (h.schedule_type = 'weekdays' and extract(isodow from today)::int = any(h.weekdays))
        or (h.schedule_type = 'monthdays' and extract(day from today)::int = any(h.monthdays))
      )
      and not exists (
        select 1 from habit_logs l where l.habit_id = h.id and l.date = today
      );

    -- Skip спокойного дня.
    if overdue_count = 0 and today_tasks_text is null and habits_text is null then
      continue;
    end if;

    -- Сборка сообщения.
    body := '🌅 Доброе утро, ' || display_name || '!';

    if overdue_count > 0 then
      body := body || E'\n\n🔥 Просрочено: <b>' || overdue_count || '</b>';
    end if;

    if today_tasks_text is not null then
      body := body || E'\n\n⚠️ На сегодня:\n' || today_tasks_text;
    end if;

    if habits_text is not null then
      body := body || E'\n\n🔁 Привычки:\n' || habits_text;
    end if;

    perform _send_telegram(link.chat_id, body, link.assignee, 'morning');
  end loop;
end;
$$;

-- ─── Вечернее напоминание о привычках ───────────────────────────────
create or replace function send_evening_habits()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  link         record;
  today        date := current_date;
  habits_text  text;
  display_name text;
  body         text;
begin
  for link in select assignee, chat_id from telegram_links loop
    display_name := case link.assignee when 'nick' then 'Никита' else 'Галочка' end;

    select string_agg('   • ' || title, E'\n' order by title) into habits_text
    from habits h
    where h.assignee = link.assignee
      and h.archived = false
      and (
        h.schedule_type = 'daily'
        or (h.schedule_type = 'weekdays' and extract(isodow from today)::int = any(h.weekdays))
        or (h.schedule_type = 'monthdays' and extract(day from today)::int = any(h.monthdays))
      )
      and not exists (
        select 1 from habit_logs l where l.habit_id = h.id and l.date = today
      );

    -- Skip если все привычки на сегодня отмечены.
    if habits_text is null then continue; end if;

    body :=
      '🔁 ' || display_name || ', не забудь отметить:' || E'\n\n' ||
      habits_text || E'\n\n' ||
      '<i>День ещё не закончился — и привычки тоже.</i>';

    perform _send_telegram(link.chat_id, body, link.assignee, 'evening');
  end loop;
end;
$$;

-- ─── Расписание pg_cron (UTC) ───────────────────────────────────────
-- 08:00 МСК = 05:00 UTC; 21:00 МСК = 18:00 UTC.
-- Москва — UTC+3 без перехода на летнее время с 2014, безопасно прибивать.

-- Идемпотентная (де)регистрация: если такой job уже есть — снимаем и регистрируем заново.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'tg_morning_digest') then
    perform cron.unschedule('tg_morning_digest');
  end if;
  if exists (select 1 from cron.job where jobname = 'tg_evening_habits') then
    perform cron.unschedule('tg_evening_habits');
  end if;
end $$;

select cron.schedule('tg_morning_digest', '0 5 * * *',  $$select public.send_morning_digest()$$);
select cron.schedule('tg_evening_habits', '0 18 * * *', $$select public.send_evening_habits()$$);
