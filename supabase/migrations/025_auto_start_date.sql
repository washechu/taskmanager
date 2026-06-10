-- м.025 — авто-заполнение tasks.start_date при первом переходе в in_progress.
--
-- Семантика колонки: фактическая дата начала работы над задачей. Поле в форму
-- не возвращаем — заполняется автоматически BEFORE-триггером:
--   • status переходит в 'in_progress' (или задача СОЗДАЁТСЯ со статусом
--     'in_progress'), И
--   • start_date пуст (null)
--   → ставим current_date.
--
-- Не перезаписываем при последующих переходах (вернули из done → не сбрасываем
-- дату первого старта; перешли in_progress→paused→in_progress → дата остаётся
-- с первого раза).
--
-- Старые задачи не трогаем: их start_date был обнулён м.023, новых триггеров
-- они не получат пока не переведутся в in_progress.
--
-- Зависит от м.023 (start_date у задач обнулён).

create or replace function _auto_set_start_date()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'in_progress' and NEW.start_date is null then
    NEW.start_date := current_date;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_auto_start_date on tasks;
create trigger trg_auto_start_date
  before insert or update of status on tasks
  for each row execute function _auto_set_start_date();
