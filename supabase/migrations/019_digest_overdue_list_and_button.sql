-- м.019 — улучшения дайджестов:
--   1. Просроченные задачи показываются СПИСКОМ (топ-5 с названием и датой),
--      а не только числом. Если больше 5 — «…и ещё N».
--   2. _html_escape применяется ко всем title задач (раньше только к привычкам)
--      — фикс потенциального падения HTML-парсинга в Telegram.
--
-- (URL-кнопка «Открыть планировщик» убрана — переход из бота открывается во
--  встроенном webview Telegram без сессии, каждый раз требует повторного логина.)
--
-- Затрагивает обе функции: send_morning_digest (м.010) и send_evening_digest (м.011).
--
-- Зависит от м.018 (одна сигнатура _send_telegram с reply_markup default null).

-- ─── Утренний дайджест ──────────────────────────────────────────────
create or replace function send_morning_digest()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  link             record;
  today            date := current_date;
  overdue_count    int;
  overdue_text     text;
  today_tasks_text text;
  habits_text      text;
  body             text;
  display_name     text;
begin
  for link in select assignee, chat_id from telegram_links loop
    display_name := case link.assignee when 'nick' then 'Никита' else 'Галочка' end;

    -- Просрочка: общее число + топ-5 (раньше всего просроченные)
    select count(*) into overdue_count
    from tasks
    where status != 'done' and due_date is not null and due_date < today
      and (link.assignee = any(assignees) or (assignees = '{}' and category = 'personal'));

    if overdue_count > 0 then
      select string_agg(
        '   • ' || _html_escape(title) || ' <i>(' || due_date || ')</i>',
        E'\n' order by due_date, title
      ) into overdue_text
      from (
        select title, due_date
        from tasks
        where status != 'done' and due_date is not null and due_date < today
          and (link.assignee = any(assignees) or (assignees = '{}' and category = 'personal'))
        order by due_date, title
        limit 5
      ) t;
    else
      overdue_text := null;
    end if;

    -- Задачи на сегодня (до 10 по приоритету)
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
      where status != 'done' and due_date = today
        and (link.assignee = any(assignees) or (assignees = '{}' and category = 'personal'))
      order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, title
      limit 10
    ) t;

    -- Привычки на сегодня (мои, активные, ещё не отмеченные)
    select string_agg('   • ' || _html_escape(title), E'\n' order by title) into habits_text
    from habits h
    where h.assignee = link.assignee and h.archived = false
      and (
        h.schedule_type = 'daily'
        or (h.schedule_type = 'weekdays' and extract(isodow from today)::int = any(h.weekdays))
        or (h.schedule_type = 'monthdays' and extract(day from today)::int = any(h.monthdays))
      )
      and not exists (select 1 from habit_logs l where l.habit_id = h.id and l.date = today);

    if overdue_count = 0 and today_tasks_text is null and habits_text is null then
      continue;
    end if;

    body := '🌅 Доброе утро, ' || display_name || '!';
    if overdue_count > 0 then
      body := body || E'\n\n🔥 Просрочено (' || overdue_count || E'):\n' || overdue_text;
      if overdue_count > 5 then
        body := body || E'\n   <i>…и ещё ' || (overdue_count - 5) || '</i>';
      end if;
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

-- ─── Вечерний дайджест ──────────────────────────────────────────────
create or replace function send_evening_digest()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  link             record;
  today            date := current_date;
  overdue_count    int;
  overdue_text     text;
  today_tasks_text text;
  habits_text      text;
  body             text;
  display_name     text;
begin
  for link in select assignee, chat_id from telegram_links loop
    display_name := case link.assignee when 'nick' then 'Никита' else 'Галочка' end;

    select count(*) into overdue_count
    from tasks
    where status != 'done' and due_date is not null and due_date < today
      and (link.assignee = any(assignees) or (assignees = '{}' and category = 'personal'));

    if overdue_count > 0 then
      select string_agg(
        '   • ' || _html_escape(title) || ' <i>(' || due_date || ')</i>',
        E'\n' order by due_date, title
      ) into overdue_text
      from (
        select title, due_date
        from tasks
        where status != 'done' and due_date is not null and due_date < today
          and (link.assignee = any(assignees) or (assignees = '{}' and category = 'personal'))
        order by due_date, title
        limit 5
      ) t;
    else
      overdue_text := null;
    end if;

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
      where status != 'done' and due_date = today
        and (link.assignee = any(assignees) or (assignees = '{}' and category = 'personal'))
      order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, title
      limit 10
    ) t;

    select string_agg('   • ' || _html_escape(title), E'\n' order by title) into habits_text
    from habits h
    where h.assignee = link.assignee and h.archived = false
      and (
        h.schedule_type = 'daily'
        or (h.schedule_type = 'weekdays' and extract(isodow from today)::int = any(h.weekdays))
        or (h.schedule_type = 'monthdays' and extract(day from today)::int = any(h.monthdays))
      )
      and not exists (select 1 from habit_logs l where l.habit_id = h.id and l.date = today);

    if overdue_count = 0 and today_tasks_text is null and habits_text is null then
      continue;
    end if;

    body := '🌙 ' || display_name || ', вечер пришёл — что осталось:';
    if overdue_count > 0 then
      body := body || E'\n\n🔥 Просрочено (' || overdue_count || E'):\n' || overdue_text;
      if overdue_count > 5 then
        body := body || E'\n   <i>…и ещё ' || (overdue_count - 5) || '</i>';
      end if;
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
