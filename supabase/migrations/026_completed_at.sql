-- м.026 — добавляем tasks.completed_at для честных TTM-метрик.
--
-- Симметрично к м.025 (start_date = когда задача стала «в работе»):
--   completed_at = когда задача была закрыта (status='done').
--
-- Почему не считаем по updated_at: оно отражает ЛЮБОЕ изменение строки.
-- Если после done кто-то поправил коммент, потаскал статус взад-вперёд или
-- сменил тег — updated_at уезжает, cycle time лжёт.
--
-- Логика триггера _auto_set_completed_at (BEFORE INSERT OR UPDATE OF status):
--   • status переходит в 'done' (или создаётся со статусом 'done'), И
--   • completed_at пуст
--   → ставим now()
-- Не перезаписываем при последующих переходах: вернули из done → не сбрасываем;
-- done → todo → done → дата с первого раза. Дата первого закрытия фиксируется
-- навсегда.
--
-- Тип: timestamptz (а не date) — точнее для будущей аналитики (среднее время
-- в работе с точностью до часов, не только дней).
--
-- Старые done-задачи не трогаем (backfill из updated_at был бы вранье). Они
-- получат completed_at только при следующем переходе в done.
--
-- Зависит от м.025.

alter table tasks
  add column if not exists completed_at timestamptz;

create or replace function _auto_set_completed_at()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'done' and NEW.completed_at is null then
    NEW.completed_at := now();
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_auto_completed_at on tasks;
create trigger trg_auto_completed_at
  before insert or update of status on tasks
  for each row execute function _auto_set_completed_at();
