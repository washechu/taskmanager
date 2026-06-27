-- м.030 — identity-хребет `app_users`.
--
-- Подготовка к Telegram Mini App (auth через initData) и к будущему
-- «ограниченному кругу» пользователей. До этого личность пользователя жила
-- только как enum 'nick' | 'galya' (захардкожен в типах, RLS, telegram_links,
-- assignees, comments.author, habits.assignee). Чтобы пустить третьего+
-- человека, нужен настоящий стол пользователей с UUID.
--
-- ВАЖНО: эта миграция НИЧЕГО не ломает. Она только ДОБАВЛЯЕТ таблицу и
-- засевает её существующими двумя. Прикладной код пока продолжает работать
-- через enum (useCurrentUser мапит email → nick/galya). Связь enum↔uuid
-- держит колонка legacy_assignee — мост на время переезда (Фаза 2 заменит
-- enum на user_id везде и колонку можно будет убрать).
--
-- Allowlist (выбор пользователя): доступ к Mini App только у заранее
-- заведённых telegram_id. В Фазе 1 отдельная таблица не нужна — наличие
-- строки в app_users с непустым telegram_id == «пускаем». Добавить человека
-- в круг = вставить строку. Незнакомый telegram_id → auth-эндпоинт вернёт
-- 403 (реализуется в следующем PR).

create table app_users (
  id uuid primary key default gen_random_uuid(),
  -- Telegram user_id (для приватного чата == chat_id). Nullable: канонические
  -- пользователи могут существовать до привязки Telegram (вход по email).
  telegram_id bigint unique,
  username text,
  display_name text not null,
  -- Мост к старому enum. unique + nullable: будущие «круговые» пользователи
  -- его не имеют (null), у текущих двоих — 'nick' / 'galya'.
  legacy_assignee text unique check (legacy_assignee in ('nick', 'galya')),
  created_at timestamptz default now()
);

create index on app_users(telegram_id);

-- ── Сид ───────────────────────────────────────────────────────────────
-- 1. Гарантируем существование двух канонических пользователей, даже если
--    Telegram ещё не привязан (telegram_links пуст).
insert into app_users (display_name, legacy_assignee)
values ('Никита', 'nick'),
       ('Галочка', 'galya')
on conflict (legacy_assignee) do nothing;

-- 2. Подтягиваем telegram_id / username из telegram_links, где привязка есть.
update app_users au
set telegram_id = tl.chat_id,
    username    = coalesce(au.username, tl.username)
from telegram_links tl
where tl.assignee = au.legacy_assignee
  and au.telegram_id is null;

-- ── RLS ───────────────────────────────────────────────────────────────
-- Читать профили могут все authenticated (для отображения имён участников).
-- Записи — только через service_role (auth-эндпоинт, добавление в круг).
alter table app_users enable row level security;

create policy "Authenticated read app_users" on app_users
  for select using (auth.role() = 'authenticated');
