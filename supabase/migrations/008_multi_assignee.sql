-- м.008 — множественные ответственные у задач и проектов.
-- Привычки остаются с одним assignee (= создатель), они индивидуальны.
--
-- tasks.assignee text         → tasks.assignees text[]
-- projects.assignee text      → projects.assignees text[]
--
-- Существующие записи: assignees = array[assignee] если assignee не null,
-- иначе пустой массив.

-- ─── tasks ──────────────────────────────────────────────────────────
alter table tasks
  add column if not exists assignees text[] not null default '{}'
    check (assignees <@ array['nick','galya']::text[]);

update tasks
  set assignees = array[assignee]
  where assignee is not null and assignees = '{}';

alter table tasks drop column if exists assignee;

-- ─── projects ───────────────────────────────────────────────────────
alter table projects
  add column if not exists assignees text[] not null default '{}'
    check (assignees <@ array['nick','galya']::text[]);

update projects
  set assignees = array[assignee]
  where assignee is not null and assignees = '{}';

alter table projects drop column if exists assignee;

-- Привычки не трогаем: habits.assignee остаётся text (см. м.005).
