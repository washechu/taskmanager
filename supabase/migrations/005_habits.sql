-- Регулярные задачи / привычки (jiu-jitsu, английский и т.п.)
-- Расписание задаётся конкретными днями недели (ISO: 1=Пн … 7=Вс).

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('personal', 'family')),
  assignee text check (assignee in ('nick', 'galya')),
  weekdays int[] not null default '{}',   -- ISO weekday numbers 1..7 (Пн..Вс)
  color text not null default 'blue'
    check (color in ('gray','red','orange','yellow','green','blue','purple','pink')),
  archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Отметки выполнения: наличие строки = привычка выполнена в этот день.
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  created_at timestamptz default now(),
  unique (habit_id, date)
);

create index if not exists habits_assignee_idx on habits(assignee);
create index if not exists habit_logs_habit_idx on habit_logs(habit_id);
create index if not exists habit_logs_date_idx on habit_logs(date);

-- RLS: как у tasks/projects/tags — read+write для всех authenticated.
alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "Authenticated read habits" on habits
  for select using (auth.role() = 'authenticated');
create policy "Authenticated write habits" on habits
  for all using (auth.role() = 'authenticated');

create policy "Authenticated read habit_logs" on habit_logs
  for select using (auth.role() = 'authenticated');
create policy "Authenticated write habit_logs" on habit_logs
  for all using (auth.role() = 'authenticated');

-- Realtime
alter publication supabase_realtime add table habits;
alter publication supabase_realtime add table habit_logs;
