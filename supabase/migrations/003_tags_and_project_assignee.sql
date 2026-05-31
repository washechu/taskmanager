-- Добавление ответственного к проектам
alter table projects add column if not exists assignee text
  check (assignee in ('nick', 'galya'));

-- Таблица тегов с цветовым кодированием
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default 'gray'
    check (color in ('gray','red','orange','yellow','green','blue','purple','pink')),
  created_at timestamptz default now()
);

create index if not exists tags_name_idx on tags(name);

alter table tags enable row level security;

create policy "Authenticated read tags" on tags
  for select using (auth.role() = 'authenticated');
create policy "Authenticated write tags" on tags
  for all using (auth.role() = 'authenticated');

alter publication supabase_realtime add table tags;
