-- м.007 — расписания привычек: помимо weekdays добавляем тип расписания
-- (daily / weekdays / monthdays) и массив дней месяца для monthdays.

alter table habits
  add column if not exists schedule_type text not null default 'weekdays'
    check (schedule_type in ('daily', 'weekdays', 'monthdays')),
  add column if not exists monthdays int[] not null default '{}';

-- Существующие записи остаются с type='weekdays' и заполненным массивом weekdays.
-- Для 'daily' — weekdays/monthdays игнорируются.
-- Для 'monthdays' — weekdays игнорируется, monthdays содержит числа 1..31.
