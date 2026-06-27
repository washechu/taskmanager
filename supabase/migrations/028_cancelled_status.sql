-- м.028 — статус «Отменено» (cancelled).
--
-- До этого было 4 статуса: todo / in_progress / done / paused. У paused
-- семантика «отложено, вернёмся» — но многие задачи становятся неактуальными
-- окончательно (передумали, решили не делать, проблема ушла сама). Делать
-- их done — ложь в аналитике («закрыто»). Удалять — теряется история.
--
-- Решение: 5-й статус 'cancelled'.
--   - В канбане НЕТ отдельной колонки — отменённые скрываются (как архив
--     done > 14 дней). Меняется через StatusMenu / форму, не через DnD.
--   - В Списке — toggle «Отменённые (N)» аналогично архиву.
--   - В аналитике НЕ учитывается ни в «Закрыто», ни в «Просрочено».
--     KPI «Отменено» осознанно не добавляется.
--   - Дайджесты Telegram перестают звать «просрочкой» (см. м.029).
--
-- Симметрично у projects: реже актуально, но для консистентности схемы
-- (один Status type в TS) добавляем туда же.

alter table tasks
  drop constraint tasks_status_check,
  add  constraint tasks_status_check
       check (status in ('todo', 'in_progress', 'done', 'paused', 'cancelled'));

alter table projects
  drop constraint projects_status_check,
  add  constraint projects_status_check
       check (status in ('todo', 'in_progress', 'done', 'paused', 'cancelled'));
