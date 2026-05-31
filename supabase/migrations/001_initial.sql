-- Проекты
create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'paused')),
  category text not null
    check (category in ('personal', 'family')),
  start_date date,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Задачи
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'paused')),
  priority text not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  category text not null
    check (category in ('personal', 'family')),
  project_id uuid references projects(id) on delete set null,
  assignee text check (assignee in ('nick', 'galya')),
  due_date date,
  start_date date,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Комментарии
create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author text not null check (author in ('nick', 'galya')),
  text text not null,
  created_at timestamptz default now()
);

-- Индексы
create index on tasks(status);
create index on tasks(category);
create index on tasks(project_id);
create index on tasks(due_date);
create index on comments(task_id);

-- RLS
alter table tasks enable row level security;
alter table projects enable row level security;
alter table comments enable row level security;

create policy "Authenticated read tasks" on tasks
  for select using (auth.role() = 'authenticated');
create policy "Authenticated write tasks" on tasks
  for all using (auth.role() = 'authenticated');

create policy "Authenticated read projects" on projects
  for select using (auth.role() = 'authenticated');
create policy "Authenticated write projects" on projects
  for all using (auth.role() = 'authenticated');

create policy "Authenticated read comments" on comments
  for select using (auth.role() = 'authenticated');
create policy "Authenticated insert comments" on comments
  for insert with check (auth.role() = 'authenticated');
create policy "Delete own comments" on comments
  for delete using (
    (author = 'nick' and auth.email() = 'nick@example.com') or
    (author = 'galya' and auth.email() = 'galya@example.com')
  );

-- Realtime
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table comments;
