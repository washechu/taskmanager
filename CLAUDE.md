# Персональный планировщик (Никита + Галочка)

## Инструкция для Claude Code

Этот файл — живая документация проекта. Обновляй его при каждом значимом изменении:

- Добавлен новый компонент или страница → обнови раздел Project Structure
- Добавлена новая таблица или изменена схема → обнови раздел База данных
- Принято новое архитектурное решение → добавь в раздел Ключевые решения
- Изменился стек или добавилась зависимость → обнови раздел Stack
- Что-то вошло или вышло из scope → обнови соответствующий раздел

Обновляй файл в том же коммите что и код. Не жди отдельной просьбы.

---

Веб-приложение для управления задачами и проектами двух пользователей.
Работает одинаково на десктопе и мобильном. Реалтайм синхронизация.

**Расположение кода:** `/Users/washechuvachestvo/Desktop/taskmanager` (вне Cyrillic-папки `таски` — npm не любит русские имена в `create-next-app`).

**Прод:** https://taskmanager-sooty-phi-79.vercel.app
**GitHub:** https://github.com/washechu/taskmanager

## Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Backend / DB**: Supabase (PostgreSQL + Realtime + Auth, новый key-format `sb_publishable_...`)
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities
- **Даты**: date-fns + локаль `ru`
- **Иконки PWA**: sharp (dev) — генерирует PNG из SVG-скрипта
- **Хостинг**: Vercel (авто-деплой при push в main)
- **PWA**: next-pwa (manifest + service worker)
- **Графики**: recharts (используется только в `AnalyticsView`, ~110KB)

## Project Structure

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # Страница входа
│   ├── (app)/
│   │   ├── today/page.tsx        # 🏠 Сегодня (просрочка + сегодняшние задачи + привычки)
│   │   ├── tasks/page.tsx        # Задачи (Канбан / Список / Календарь / Аналитика)
│   │   ├── projects/page.tsx     # Проекты (Канбан / Гант)
│   │   ├── habits/page.tsx       # Привычки (недельный чеклист по дням недели)
│   │   └── layout.tsx            # Layout с навигацией + auth guard
│   ├── api/telegram/webhook/route.ts # Telegram Bot webhook (/start, /test, link callbacks)
│   ├── layout.tsx                # PWA metadata, viewport, icons
│   ├── globals.css               # Кастомные стили селектов и пр.
│   └── page.tsx                  # redirect → /today
├── components/
│   ├── tasks/
│   │   ├── KanbanBoard.tsx       # Канбан + DnD + state модалок
│   │   ├── KanbanColumn.tsx      # Колонка статуса + per-column priority sort
│   │   ├── TaskCard.tsx          # Карточка задачи (фикс. высота)
│   │   ├── TaskModal.tsx         # Модалка задачи (view + edit)
│   │   ├── TaskForm.tsx          # Форма создания/редактирования + dateError
│   │   ├── CommentSection.tsx    # Комментарии (user + audit разных стилей)
│   │   ├── TaskFilters.tsx       # Фильтры + rightAction-слот для +Задача
│   │   ├── ListView.tsx          # Вид таблицей с сортируемыми заголовками + slice по дедлайну (Сегодня/Неделя/Месяц/Все)
│   │   ├── CalendarView.tsx      # Календарь со срезами Сегодня/Неделя/Месяц (месяц: десктоп чипы / мобайл точки + день-шит)
│   │   ├── AnalyticsView.tsx     # Дашборд: KPI + донаты + стек-бар + списки
│   │   └── GanttView.tsx         # (НЕ используется на странице задач; зарезервирован)
│   ├── projects/
│   │   ├── ProjectKanban.tsx     # Канбан проектов (stateless)
│   │   ├── ProjectCard.tsx       # Карточка проекта (фикс. высота, как у задач)
│   │   ├── ProjectModal.tsx      # Модалка проекта + ProjectForm (экспорт)
│   │   ├── ProjectFilters.tsx    # Фильтры + rightAction для +Проект
│   │   └── ProjectGantt.tsx      # Иерархический Гант: проекты + вложенные задачи
│   ├── habits/
│   │   ├── HabitsView.tsx        # Карточки: WeekStrip для daily/weekdays, MonthGrid для monthdays
│   │   └── HabitModal.tsx        # Модалка привычки (view + edit) + HabitForm (эмодзи-иконка) + блок «Статистика»
│   └── ui/                       # Базовые примитивы дизайн-системы
│       ├── Modal.tsx             # Единый шелл диалогов: overlay+panel+header+body, layer/size/dismissable
│       ├── ConfirmModal.tsx      # Поверх Modal: подтверждение действия, layer=confirm
│       ├── Button.tsx            # primary / secondary / ghost / destructive (h-10)
│       ├── IconButton.tsx        # Иконочная кнопка (h-10 w-10 / h-8 w-8), tone default/danger
│       ├── Input.tsx             # Текстовый input (h-10), optional invalid → красная рамка
│       ├── Select.tsx            # Нативный <select> (h-10), invalid prop
│       ├── TextArea.tsx          # Многострочный input, высота через rows
│       ├── DateInput.tsx         # Input type=date + ✕ кнопка очистки (iOS Safari fix)
│       ├── AssigneePicker.tsx    # Чип-тогглер множественных ответственных (м.008)
│       ├── SegmentedControl.tsx  # Сегмент-контрол: variant view (iOS-пилюля) / filter (синяя заливка)
│       ├── Fab.tsx               # Floating Action Button (создание задачи/проекта)
│       ├── Navigation.tsx        # Sidebar/bottom nav (с эмодзи) + экспорт MobileViewTabs (использует SegmentedControl)
│       ├── StatusBadge.tsx       # С dark-вариантами для всех цветов
│       ├── StatusMenu.tsx        # Кликабельный StatusBadge → выпадайка с 4 статусами (быстрая смена)
│       ├── PriorityBadge.tsx     # С цветной точкой + контрастный фон
│       ├── EmptyState.tsx
│       ├── Skeleton.tsx          # Пульсирующий плейсхолдер для loading-состояний
│       ├── TagChip.tsx           # Цветной тег (resolve color по name из allTags)
│       └── TagPicker.tsx         # Мультиселект + создание нового тега + color picker
├── lib/
│   ├── supabase/{client,server,middleware}.ts  # Supabase клиенты + auth middleware
│   ├── hooks/
│   │   ├── useTasks.ts                # CRUD + Realtime
│   │   ├── useProjects.ts             # CRUD + Realtime
│   │   ├── useComments.ts             # CRUD + Realtime (вкл. kind)
│   │   ├── useTags.ts                 # CRUD + Realtime
│   │   ├── useHabits.ts               # CRUD привычек + habit_logs + toggleLog + Realtime
│   │   ├── useCurrentUser.ts          # email → assignee (по env vars)
│   │   └── useAuditedTaskUpdate.ts    # Обёртка updateTask с audit-комментариями (diffTask)
│   ├── diffTask.ts               # Утилита: разница старой и новой задачи → audit-строки
│   ├── dueStatus.ts              # dueStatus(task) → overdue/today/future/null + dueIcon (🔥/⚠️)
│   ├── habitStats.ts             # Стат по привычке: текущая/лучшая серия, total, % за 30 дней
│   ├── archive.ts                # isArchivedTask(t) — done + updated_at > 14 дней
│   ├── telegram.ts               # Server-only helper: Telegram Bot API + лог
│   └── types.ts                  # Type-ы и enum-словари (STATUSES, PRIORITIES, etc.)
├── middleware.ts                 # Next.js middleware → updateSession
├── scripts/
│   ├── seed.ts                   # Сид: проекты по умолчанию
│   └── generate-icons.mjs        # Генерация PWA-иконок из SVG через sharp
├── supabase/migrations/
│   ├── 001_initial.sql           # Базовая схема + RLS + Realtime publications
│   ├── 002_fix_comment_policy.sql # RLS для real-email пользователей
│   ├── 003_tags_and_project_assignee.sql # Таблица tags + projects.assignee
│   ├── 004_comment_kind.sql      # comments.kind ('user'/'audit')
│   ├── 005_habits.sql            # Таблицы habits + habit_logs (привычки)
│   ├── 006_habit_icons.sql       # habits.icon (эмодзи) + дефолт category
│   ├── 007_habit_schedule_types.sql # habits.schedule_type + monthdays
│   ├── 008_multi_assignee.sql    # tasks/projects: assignee → assignees text[]
│   ├── 009_telegram_notifications.sql # telegram_links + tasks.invited_by/invite_status + telegram_log
│   ├── 010_telegram_schedule.sql # app_settings + pg_cron/pg_net + утренний/вечерний дайджесты
│   ├── 011_telegram_events.sql   # триггеры событий + RPC respond_to_invite_rpc + send_evening_digest
│   ├── 012_invite_polish.sql     # app_url + URL-кнопка в пуше invite_sent + audit «Создано предложение»
│   ├── 013_invite_polish_2.sql   # URL-кнопка в пуше invite_replied + таймаут pg_net 15с
│   ├── 014_invite_delegation.sql # _auto_set_invite + _notify_partner_done для делегирования (assignees=1)
│   ├── 015_invite_sent_timeout.sql # таймаут 15с в _notify_invite_sent + феминитив «предложила»
│   ├── 016_done_url_button.sql   # URL-кнопка «Открыть задачу» в пуше done + _send_telegram(reply_markup)
│   ├── 017_invite_buttons_emoji_only.sql # эмодзи без подписей у callback-кнопок ответа в пуше invite
│   ├── 018_fix_send_telegram_overload.sql # фикс: drop устаревшей 4-арной сигнатуры _send_telegram (регрессия м.016)
│   ├── 019_digest_overdue_list_and_button.sql # дайджесты: просроченные списком + URL-кнопка «🏠 Открыть планировщик» + _html_escape для title (+фикс literal \n)
│   ├── 020_decline_to_paused.sql # decline через Telegram-кнопку → status='paused'
│   ├── 021_remove_open_task_buttons.sql # убраны URL-кнопки «Открыть задачу» из пушей (webview без сессии)
│   └── 022_digests_skip_deferred.sql # дайджесты пропускают отложенные задачи (start_date в будущем)
└── public/
    ├── manifest.json             # PWA manifest
    └── icons/                    # 192, 512, apple-touch (180), favicons
```

## Development

### Требования
- Node.js 18+
- Supabase аккаунт (free tier)
- Vercel аккаунт (free tier)

### Запуск
```bash
npm install
cp .env.example .env.local
# заполнить ключи
npm run dev
```

### Переменные окружения
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # publishable key (формат sb_publishable_...)
SUPABASE_SERVICE_ROLE_KEY=              # seed-скрипт + Telegram webhook (server-only)
NEXT_PUBLIC_NICK_EMAIL=                 # email Никиты для распознавания
NEXT_PUBLIC_GALYA_EMAIL=                # email Галочки для распознавания
TELEGRAM_BOT_TOKEN=                     # PR α: токен от @BotFather (server-only)
TELEGRAM_WEBHOOK_SECRET=                # PR α: 64-hex для валидации входящих webhook (server-only)
```

Переменные нужно дублировать в Vercel → Project Settings → Environment Variables.

### Seed
```bash
npm run seed   # одноразово, создаёт стартовые проекты
```

### Генерация иконок
```bash
node scripts/generate-icons.mjs
```

## База данных (Supabase / PostgreSQL)

### Текущая схема (после миграций 001–004)

```sql
-- Проекты
create table projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'paused')),
  category text not null check (category in ('personal', 'family')),
  assignees text[] not null default '{}'                -- м.008 (множественные)
    check (assignees <@ array['nick','galya']::text[]),
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
  category text not null check (category in ('personal', 'family')),
  project_id uuid references projects(id) on delete set null,
  assignees text[] not null default '{}'                -- м.008 (множественные)
    check (assignees <@ array['nick','galya']::text[]),
  due_date date,
  start_date date,
  tags text[] default '{}',     -- массив имён тегов (метаданные цвета в таблице tags)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Комментарии (user + audit)
create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author text not null check (author in ('nick', 'galya')),
  text text not null,
  kind text default 'user' check (kind in ('user', 'audit')),  -- м.004
  created_at timestamptz default now()
);

-- Теги с цветовым кодированием
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default 'gray'
    check (color in ('gray','red','orange','yellow','green','blue','purple','pink')),
  created_at timestamptz default now()
);

-- Привычки / регулярные задачи (м.005)
create table habits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  icon text,                              -- эмодзи (м.006)
  category text not null default 'personal' check (category in ('personal', 'family')),  -- в UI не задаётся
  assignee text check (assignee in ('nick', 'galya')),  -- = создатель привычки
  schedule_type text not null default 'weekdays'
    check (schedule_type in ('daily', 'weekdays', 'monthdays')),  -- м.007
  weekdays int[] not null default '{}',   -- ISO дни недели 1=Пн … 7=Вс (для type='weekdays')
  monthdays int[] not null default '{}',  -- числа месяца 1..31 (для type='monthdays', м.007)
  color text not null default 'blue'
    check (color in ('gray','red','orange','yellow','green','blue','purple','pink')),
  archived boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Отметки выполнения: наличие строки = привычка выполнена в этот день (м.005)
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  created_at timestamptz default now(),
  unique (habit_id, date)
);

-- Индексы
create index on tasks(status);
create index on tasks(category);
create index on tasks(project_id);
create index on tasks(due_date);
create index on comments(task_id);
create index on tags(name);
create index on habits(assignee);
create index on habit_logs(habit_id);
create index on habit_logs(date);
```

### RLS

- **tasks, projects, tags, habits, habit_logs:** read+write для всех authenticated.
- **comments:** read+insert для всех, **delete** только своих *user*-комментариев (audit-комментарии неудаляемы). Поле `auth.email()` сверяется с реальными email-ами Никиты/Галочки (см. миграцию 002 и 004).

### Realtime

Все таблицы (`tasks`, `projects`, `comments`, `tags`, `habits`, `habit_logs`) добавлены в `supabase_realtime` publication.

### Применение миграций

Через Supabase Dashboard → SQL Editor → выполнить файлы по порядку.

## Пользователи

Два пользователя в Supabase Auth. Соответствие email ↔ `assignee` (`nick` / `galya`) — через env vars `NEXT_PUBLIC_NICK_EMAIL` и `NEXT_PUBLIC_GALYA_EMAIL`. Хук `useCurrentUser` возвращает `{ assignee, email, loading }`.

Если email авторизованного пользователя не совпал ни с одним из env vars — на странице задач показывается жёлтое предупреждение.

## Статусы и значения

```typescript
export const STATUSES = {
  todo:        { label: 'Беклог',      color: 'gray'   },
  in_progress: { label: 'В процессе',  color: 'yellow' },  // жёлтый везде: бейджи, канбан-колонки, ганты, графики
  // Бейдж статуса использует более насыщенный yellow-200/800 (StatusBadge),
  // чтобы отличаться от бледно-янтарного бейджа приоритета «Средний» (amber).
  done:        { label: 'Готово',      color: 'green'  },
  paused:      { label: 'Остановлено', color: 'orange' },
}

export const PRIORITIES = {
  high:   { label: 'Высокий', color: 'red'    },
  medium: { label: 'Средний', color: 'yellow' },
  low:    { label: 'Низкий',  color: 'green'  },
}

export const CATEGORIES = {
  personal: { label: 'Личное',    icon: '👤' },
  family:   { label: 'Семейное',  icon: '👫' },
}

export const ASSIGNEES = {
  nick:  { label: 'Никита'  },
  galya: { label: 'Галочка' },
}

export const TAG_COLORS = {
  gray, red, orange, yellow, green, blue, purple, pink   // 8 цветов
  // каждый: { label, bg (Tailwind классы), text (Tailwind классы) }
}
```

> Хардкоженных `DEFAULT_TAGS` больше нет — теги в БД, управляются через `TagPicker`.

## Дизайн-система

Канонический набор токенов. **Никаких произвольных пиксельных значений** (`text-[10px]`, `h-9`, `rounded-md` без причины) — если нужного токена в таблице ниже нет, добавляем его сюда, а не лепим на месте. Цель — чтобы консистентность держалась автоматически через переиспользуемые компоненты, а не через силу воли.

> **Статус миграции на токены:**
> - ✅ `SegmentedControl`, `Button`, `IconButton` — извлечены в `components/ui/`.
> - ✅ `StatusBadge` — есть dark-варианты.
> - ✅ `/habits` (двойной тоггл) — мигрирован: scope = `filter`, week/month = `view`.
> - ✅ `MobileViewTabs` — переехал на `SegmentedControl` variant=view.
> - ✅ `Modal` извлечён, TaskModal/ProjectModal/HabitModal/ConfirmModal и все 5 create-sheet (kanban + страницы tasks/projects/habits) сидят на нём. ConfirmModal приехал к стандартным токенам (`rounded-2xl`, bottom-sheet на мобиле, Button-кнопки).
> - ✅ Calendar и Gantt slice toggles (Сегодня/Неделя/Месяц) — `SegmentedControl` variant=view, ←/→ — `IconButton`, «Сегодня» — `Button(secondary)`. Тулбары обоих компонентов выровнены по 40px.
> - ✅ Analytics период — `SegmentedControl` variant=filter.
> - ✅ Категория-вкладки в `TaskFilters` и `ProjectFilters` — `SegmentedControl` variant=filter.
> - ✅ `Input` / `Select` / `TextArea` извлечены. SELECT_CLASS дубли убраны из обоих фильтров. TaskForm / ProjectForm / HabitForm / CommentSection переехали на примитивы. Все поля форм теперь `h-10` (раньше `py-2 ≈ 38px`); HabitForm weekday-кнопки тоже `h-10`. Кнопки submit/cancel в формах — через `Button`.
> - ✅ Typography sweep: `text-[10px]` / `text-[13px]` / `font-normal` обнулены. Light-mode серый сжат до 3 ролей: `text-gray-900` (primary, 23×), `text-gray-600` (secondary, 44×), `text-gray-400` (muted, 102×). Dark-mode primary — `dark:text-gray-100`. Остались 3 «ghost»-уровня (`dark:text-gray-600/700`) для disabled-кружков дней и off-month плейсхолдеров в `HabitsView` / `CalendarView` — это намеренная 4-я ступень для очень-приглушённых элементов.

### Принципы

1. **Mobile-first.** Тач-таргет любого интерактивного элемента ≥ 40px (`h-10`). Модалки на мобиле — bottom-sheet с safe-area снизу. FAB висит над bottom nav.
2. **Семантика, не цвет.** Цвет — функция роли (primary action / secondary text / muted / accent), а не выбор по вкусу.
3. **Одна штука — один токен.** Если для «вторичного текста» три оттенка серого — это не три уровня, это бардак.
4. **Dark mode обязателен.** Каждый цветовой утилити-класс имеет `dark:` пару. Никаких компонентов без тёмной темы.

### Типографика

6 ступеней. Произвольные пиксельные размеры (`text-[10px]`, `text-[13px]`) **запрещены**.

| Роль | Токен | Размер |
|---|---|---|
| Микро-лейбл (uppercase подписи фильтров, счётчики) | `text-[11px]` | 11px |
| Меta / body-secondary (мета на карточках, описания) | `text-xs` | 12px |
| Body (всё основное) | `text-sm` | 14px |
| Заголовок карточки / модалки | `text-base` | 16px |
| Заголовок страницы (`<h1>`) | `text-xl` | 20px |
| Display (KPI, login) | `text-2xl` | 24px |

**Мобайл:** title карточки и описание увеличиваются (`text-base md:text-sm`, `text-sm md:text-xs`) — на маленьком экране нужнее читабельность, на десктопе — плотность.

Веса: только `font-medium` (UI-элементы, активные состояния), `font-semibold` (заголовки), `font-bold` (display). `font-normal` не используется (это дефолт).

### Цвет текста

3 роли, не больше.

| Роль | Light | Dark |
|---|---|---|
| Primary (основной текст, заголовки) | `text-gray-900` | `dark:text-gray-100` |
| Secondary (значения, body на тёмном фоне карточки) | `text-gray-600` | `dark:text-gray-300` |
| Muted (подписи, плейсхолдеры, disabled, иконки) | `text-gray-400` | `dark:text-gray-500` |

`text-gray-500`, `text-gray-700`, `text-gray-800` использовать **нельзя** — выбирай одну из трёх ролей выше.

### Акцент (синий)

Один токен, никаких `bg-blue-500` или `text-blue-700`.

| Роль | Токен |
|---|---|
| Primary action background | `bg-blue-600` |
| Primary action hover | `hover:bg-blue-700` |
| Link / accent text | `text-blue-600 dark:text-blue-400` |
| Subtle tint (sidebar active) | `bg-blue-50 dark:bg-blue-950` |

### Скругления (радиусы)

| Уровень | Радиус | Применение |
|---|---|---|
| Контейнеры | `rounded-xl` | Карточки, колонки канбана, список (ListView), пустые состояния |
| Модалки | `rounded-2xl` (моб. — `rounded-t-2xl`) | Все диалоги, включая ConfirmModal |
| Контролы | `rounded-lg` | Кнопки, инпуты, селекты, текстарии, сегменты, фильтры |
| Чипы/аватары/точки | `rounded-full` | Теги, статусные точки, аватарки, прогресс-бары |

### Бордеры и elevation

| Роль | Light | Dark |
|---|---|---|
| Бордер контейнера | `border-gray-200` | `dark:border-gray-700` |
| Внутренний разделитель (header модалки) | `border-gray-100` | `dark:border-gray-800` |
| Тень карточки | `shadow-sm` (`hover:shadow-md`) | — |
| Тень модалки | `shadow-xl` | — |
| Тень FAB | `shadow-lg shadow-blue-600/30` | — |

### Контролы (интерактивные элементы)

**Унифицированный размер.** Все поля и кнопки в формах, фильтрах и модалках:

- Высота — `h-10` (40px). Гарантирует тач-таргет на мобиле.
- Шрифт — `text-sm font-medium` (кнопки) или `text-sm` (поля).
- Радиус — `rounded-lg`.
- Бордер — `border-gray-200 dark:border-gray-700` (где есть).
- Паддинг: сегмент-кнопки `px-4`, селекты `pl-3` (правый под chevron из `globals.css`), date-input `px-3`, кнопки `px-4 py-2` (если `h-10` не задан явно).

Все поля форм, фильтров и комментариев сидят на примитивах `Input` / `Select` / `TextArea` — единый shell (h-10 для Input/Select, rounded-lg, общий border, dark-вариант). Для error-состояний — проп `invalid` (красная рамка). Для ширины внутри формы — `className="w-full"` (в filter-Field берёт по контенту автоматически).

### Кнопки

| Вариант | Стили | Применение |
|---|---|---|
| Primary | `h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50` | Submit, основное действие |
| Secondary | `h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800` | Cancel, парная к primary |
| Ghost | `h-10 rounded-lg px-4 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800` | Незаметные действия, «Сегодня» в тулбаре |
| Icon | `rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800` | ✏️ 🗑️ ✕ в header модалки, ← → в тулбарах |
| Danger icon | `rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950` | 🗑️ удаление |
| Destructive | `h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700` | Подтверждение удаления в ConfirmModal |

### Сегментированные контролы (выбор одного из N)

**Два варианта**, по семантике, а не по вкусу:

**`view` — переключение вида/периода** (как iOS): белая пилюля на сером треке. Все «временны́е» переключатели и тулбары видов одного типа:
- `MobileViewTabs` (Канбан/Список/Календарь/Аналитика на мобиле)
- Тулбар периода в Календаре/Ганте (Сегодня/Неделя/Месяц)
- Slice в `ListView` (Сегодня/Неделя/Месяц/Все)
- Период в `AnalyticsView` (Неделя/Месяц/Период)

```
Контейнер: grid gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800
Сегмент base: rounded-lg px-4 h-10 text-sm font-medium text-center transition-colors
Активный: bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white
Неактивный: text-gray-500 dark:text-gray-400
```

**`filter` — выбор категории/скоупа** (не времени): синяя заливка активного. Используется только там, где это не про периоды:
- Вкладки категорий (Личное/Семейное/Все) в `TaskFilters`/`ProjectFilters`
- Тоггл `Сегодня / Готово / Все` на странице Привычек (это скоуп фильтра, не время)

```
Контейнер: flex rounded-lg border border-gray-200 overflow-hidden dark:border-gray-700
Сегмент base: h-10 px-4 text-sm font-medium transition-colors
Активный: bg-blue-600 text-white
Неактивный: text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800
```

> **Важно:** если на одном экране стоят рядом два сегментированных контрола разной семантики (как на /habits: «Все/Сегодня» — фильтр, «Неделя/Месяц» — вид), они **обязаны быть разных вариантов**. Иначе глаз читает их как дубль.

### Модалки

Единый компонент **`<Modal>`** (`components/ui/Modal.tsx`). Через него рендерятся: `TaskModal`/`ProjectModal`/`HabitModal` (view + edit), `ConfirmModal` (layer=`confirm`, size=`sm`, `dismissable={false}`) и все create-sheet (`KanbanBoard` + страницы `tasks`/`projects`/`habits`).

Пропы: `title`, `headerActions` (слот слева от ✕ для ✏️/🗑️), `size` (`sm`/`md`/`lg`), `layer` (`modal` z-40 / `confirm` z-50), `dismissable` (backdrop+ESC+✕, default true). ESC закрывает только если dismissable.

```
Overlay: fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0
         sm:items-center sm:p-4
Panel: flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl
       bg-white shadow-xl dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl
Header: flex items-center justify-between border-b border-gray-100 px-5 py-4
        dark:border-gray-800 (заголовок text-base font-semibold)
Body: flex-1 overflow-y-auto px-5 pt-4
      pb-[calc(1rem+env(safe-area-inset-bottom))]
```

**Мобайл:** bottom-sheet (`items-end`, скруглён только сверху). Тело имеет нижний safe-area паддинг, чтобы контент не уходил под home-indicator. Закрытие по тапу на backdrop.

**ConfirmModal — особый случай:**
- `z-50` (рендерится поверх обычной модалки)
- `max-w-sm`, иначе те же токены (`rounded-2xl`, bottom-sheet на мобиле)
- Backdrop **не закрывает** — только явные кнопки

### Чипы / бейджи

- **Meta-чипы на карточках:** `rounded-full bg-gray-100 px-2 py-0.5 text-[11px]` (категория, ответственный, проект, дата).
- **TagChip:** два размера — `xs` (`px-2.5 py-1 text-xs`, по умолчанию) и `sm` (`px-3 py-1.5 text-sm`, в модалках). Намеренно крупнее meta-чипов.
- **StatusBadge / PriorityBadge:** см. ниже про «yellow collision». StatusBadge **обязан иметь dark-вариант** (сейчас не имеет — фикс в этапе С).

### Spacing scale

| Размер | Tailwind | Когда |
|---|---|---|
| 6px | `gap-1.5` | Между подписью и значением; мета на карточке |
| 8px | `gap-2` | Кнопки в кластере, мета-чипы |
| 12px | `gap-3` | Поля в форме (грид), кнопки в футере, колонки канбана |
| 16px | `gap-4` | Между секциями формы (по вертикали `space-y-4`), view-mode секции в модалке |
| 20px | `gap-x-5` / `px-5` | Между фильтрами в одной группе; горизонтальный паддинг модалки |
| 32px | `border-l h-6` | Вертикальный разделитель между группами фильтров |

**Стандартные паддинги:**
- Карточка: `p-3`
- Хедер модалки: `px-5 py-4`
- Тело модалки: `px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]`
- Панель фильтров: `py-3`

### Yellow collision (token-leak)

`STATUSES.in_progress.color = 'yellow'` и `PRIORITIES.medium.color = 'yellow'` — одинаковый ключ, но разные палитры:

- **StatusBadge** → `yellow-200/800` (насыщенный жёлтый — статус заметнее)
- **PriorityBadge** → `amber-100/700` (бледный янтарь — приоритет деликатнее)
- **TagChip** → `yellow-100/700` (нейтральная палитра тегов)

Это **намеренное** разведение, но абстракция `color: 'yellow'` — лживая, реального общего токена нет. Если будем переделывать — переименовать в семантические токены (`status-active`, `priority-medium`).

### Z-index scale

| z | Что |
|---|---|
| `z-30` | FAB |
| `z-40` | Обычные модалки (Task/Project/Habit) |
| `z-50` | ConfirmModal, dropdown-меню |

### Мобайл — ключевые правила

- Все интерактивные элементы — минимум `h-10` (40px тач-таргета).
- Модалки — bottom-sheet (`items-end`, `rounded-t-2xl`, safe-area `pb-[calc(...+env(safe-area-inset-bottom))]`).
- FAB — `bottom-[calc(72px+env(safe-area-inset-bottom))]` (над bottom nav).
- Bottom nav — `h-14 + pb-[env(safe-area-inset-bottom)]`, эмодзи над подписью.
- Main content — `pb-16 md:pb-0`, чтобы не уходило под bottom nav.
- Header — `pt-[env(safe-area-inset-top)]`.
- Карточки — крупнее шрифт (`text-base md:text-sm`), title+description обёрнуты в один `<button>` для удобства тапа.
- Фильтры — сворачиваются в кнопку «Фильтры (N)»; категория-вкладки всегда видны.
- Сегмент-контролы — без горизонтального скролла, влезают в ширину экрана (`grid` с равными колонками).
- Канбан — `snap-x snap-mandatory`, ширина колонки `85vw max-w-[18rem]`, свайп — одна колонка за раз.

### Селекты (HTML `<select>`)

- Нативный chevron скрыт через `appearance: none` в `globals.css`.
- Кастомный chevron — `background-image` SVG, отступ 10px справа.
- Глобальное правило, отдельные классы не нужны.

## Ключевые решения

### Telegram-уведомления (в разработке)

Дизайн-док: `docs/notifications.md` (утверждён). Реализация по фазам:

- **PR α (готово):** инфраструктура. Миграция 009 (`telegram_links`, `tasks.invited_by/invite_status`, `telegram_log`). Webhook `app/api/telegram/webhook/route.ts` обрабатывает `/start` (выбор Никита/Галочка через inline-кнопки → upsert в `telegram_links`) и `/test`. Helper `lib/telegram.ts` оборачивает Telegram Bot API + лог. Server-only через service_role (`SUPABASE_SERVICE_ROLE_KEY` в Vercel env).
- **PR β (готово):** расписание. Миграция 010: таблица `app_settings` для хранения токена бота, расширения `pg_cron`/`pg_net`, SQL-функции `_send_telegram` / `send_morning_digest()` / `send_evening_habits()`, два cron job'а (`tg_morning_digest` 08:00 МСК = 05:00 UTC; `tg_evening_habits` 21:00 МСК = 18:00 UTC). Без Edge Function — SQL вызывает Telegram API напрямую через `pg_net.http_post`.
- **PR γ (текущий):** события + расширение вечернего дайджеста. Миграция 011: хелпер `_actor()` (через `auth.email()` + `app_settings.nick_email/galya_email` или fallback `current_setting('app.actor')`); BEFORE INSERT триггер `_auto_set_invite` авто-выставляет `invited_by`+`invite_status='pending'` при создании семейной с двумя участниками; AFTER INSERT/UPDATE/INSERT триггеры на `tasks` и `comments` шлют 4 типа уведомлений (предложено, ответ, выполнено партнёром, новый коммент); RPC `respond_to_invite_rpc` для webhook'а (использует `set_config('app.actor', ...)`); UI-блок `InviteBlock` в `TaskModal` (3 кнопки для приглашённого; переключение accepted ↔ tentative; «ждём ответа» для инициатора). Вечерняя SQL-функция переименована `send_evening_habits` → `send_evening_digest` и теперь шлёт также просрочку + сегодняшние задачи.

Безопасность: webhook валидирует `X-Telegram-Bot-Api-Secret-Token` против `TELEGRAM_WEBHOOK_SECRET`. RLS на `telegram_links`/`telegram_log` без политик — доступ только через service_role.

### Архив выполненных задач

«Готово» накапливается бесконечно — через месяц колонка `done` или slice `Все` превращается в свалку. Лечится мягким архивом без миграции БД: задача со `status='done'` и `updated_at` старше **14 дней** считается архивной и скрывается из default-видов. Хелпер `isArchivedTask(task)` в `lib/archive.ts` (константа `ARCHIVE_DAYS=14`).

Где применяется:
- **Канбан → колонка «Готово»**: архивные скрыты; внизу колонки кнопка «Показать архив (N, старше 14 дней)» / «Скрыть архив». Счётчик в шапке колонки показывает только видимые. Состояние `showArchive` — локально в `KanbanColumn`.
- **Список → slice `Все`**: архивные скрыты; в правом углу тулбара ссылка «Архив (N, старше 14 дней)» / «Скрыть архив». В time-bounded срезах (`Сегодня`/`Неделя`/`Месяц`) фильтр архива не применяется — там и так временно́е окно.

Что **не** применяется (намеренно):
- Календарь, Гант — представления по датам; «архив» там не имеет смысла.
- Today, Аналитика — свои логики; не нужно.
- БД-удаление — архив только визуальный, ничего не удаляется. Восстановления нет (просто разворачивается).

### Экран «Сегодня» (`/today`)

Дефолтная страница при заходе в приложение (`/` → `/today`). Единая точка входа в день — собирает задачи и привычки в одном месте, чтобы не приходилось обходить три раздела ради дневной картины.

- **Скоуп** — auto-scope на текущего пользователя как в фильтре «Личное»: задачи где `assignees.includes(me)`, либо loose-personal (пустой массив + `category=personal`). Привычки — только `habit.assignee === me`.
- **Три секции**, видимы только если непусты:
  - 🔥 **Просрочено** — `due_date < startOfDay(today)`, не done. Сортировка по дедлайну. Акцент красный.
  - ⚠️ **Задачи на сегодня** — `due_date === today`, не done. Сортировка по приоритету (high → low).
  - 🔁 **Привычки** — запланированные на сегодня (`isHabitScheduledOn`). Группируются: pending (наверх) + Готово (внизу, с подзаголовком).
- **Интеракции**:
  - Чекбокс слева у задачи → `handleUpdate(id, { status: 'done' })` через `useAuditedTaskUpdate` (audit-комментарий сохраняется).
  - Тап по тексту задачи → открывает `TaskModal` (с тем же handleUpdate).
  - Тап по строке привычки → `toggleLog`. Read-only тут не нужен — кружок только сегодняшний.
- **Пустое состояние** (нет ни просрочки, ни сегодняшних, ни привычек) — «Спокойный день — ничего на сегодня. Можно отдохнуть 🌿».
- **Аудит-обёртка** `useAuditedTaskUpdate(tasks, updateTask, projects, currentUserAssignee)` — вытащена из `/tasks/page.tsx`, чтобы и Today, и страница задач писали одинаковые audit-комментарии при изменении задачи.

### Канбан
- Drag & drop через `@dnd-kit` (работает на мобильном — через TouchSensor с delay).
- Кнопка «+» в шапке колонки создаёт задачу с предустановленным статусом.
- Внутри пустых колонок **нет** кнопок «+ Добавить» — статус сам по себе достаточно очевидный.
- Селект статуса из карточки убран (положение в колонке = статус). Менять статус — drag или модалка.
- **Snap-scroll на мобиле:** ширина колонки 85vw (max 18rem), контейнер `snap-x snap-mandatory`. Свайп переключает по одной колонке за раз. На десктопе snap отключен.

### Мобильная адаптация
- Фильтры на `< md` сворачиваются в кнопку «Фильтры (N)» — щелчок раскрывает SECONDARY-ряд (Проект, Ответственный, Теги). Категория-вкладки всегда видны.
- Карточки: title и description используют `text-base md:text-sm` / `text-sm md:text-xs` — крупнее на мобиле для читабельности.
- Тач-зона карточки: title + description обёрнуты в единый `<button>` — удобно тыкать пальцем.
- Bottom nav: высота 56px + `pb-[env(safe-area-inset-bottom)]` для notch iPhone. Каждый пункт — эмодзи (🎯 Задачи / 📁 Проекты) над подписью (`flex-col`, `text-xs`).
- Main padding-bottom: `pb-16 md:pb-0` чтобы низ контента не уходил под bottom nav.
- **Safe-area снизу в модалках:** все модалки на мобиле — bottom-sheet (`items-end`), поэтому тело модалки/формы имеет `pb-[calc(...+env(safe-area-inset-bottom))]`, чтобы контент не прятался под home-indicator. На десктопе (`sm:`) сбрасывается в обычный паддинг.

### FAB (Floating Action Button)
- Создание задачи/проекта — через плавающую кнопку `components/ui/Fab.tsx`, а не через кнопку в панели фильтров (`rightAction` больше не передаётся, хотя проп в фильтрах остался для совместимости).
- Расширенный FAB (пилюля с «+ Задача» / «+ Проект»), `fixed` в правом нижнем углу, `z-30` (ниже модалок `z-40`).
- На мобиле висит над bottom nav: `bottom-[calc(72px+env(safe-area-inset-bottom))]`. На десктопе — `md:bottom-6 md:right-6`.

### Теги — размер чипов
- `TagChip` имеет два размера: `xs` (`px-2.5 py-1 text-xs`, по умолчанию на карточках/фильтрах) и `sm` (`px-3 py-1.5 text-sm`, в модалках). Намеренно крупнее остальных мета-бейджей.

### Per-column priority sort
- В шапке каждой колонки канбана — стрелочка с 3 состояниями: `none` / `desc` (высокий сверху) / `asc` (низкий сверху). Цикл по клику.
- Состояние независимое для каждой колонки. Хранится в `Record<Status, PrioritySort>` в `KanbanBoard`.
- Глобального фильтра «Сортировка» в задачах нет (только в `ListView` через клик по заголовку колонки и в Календаре/Ганте — навигация по периодам).

### Slice по дедлайну в Списке

В `ListView` есть тулбар `Сегодня / Неделя / Месяц / Все` (variant=`view` — все «временны́е» переключатели в проекте одного вида, см. раздел SegmentedControl). Дефолт — `Сегодня`. Срезы:
- `Сегодня` — `due_date === today`
- `Неделя` — `due_date` в текущей неделе (`weekStartsOn: 1`)
- `Месяц` — `due_date` в текущем месяце
- `Все` — без среза (включая задачи без дедлайна)

Задачи без `due_date` показываются только в `Все` — в остальных срезах их нет (с дедлайном «нет» нечего фильтровать).

### Дедлайн и мини-иконки

Хелпер `dueStatus(task)` в `lib/dueStatus.ts` возвращает `'overdue' | 'today' | 'future' | null`. На основе него выбирается мини-иконка `dueIcon`:
- 🔥 — `overdue` (`due_date < startOfDay(today)` и статус не `done`). Дедлайн красным.
- ⚠️ — `today` (`isSameDay(due_date, today)` и статус не `done`). Дедлайн оранжевым.
- (ничего) — `future` или нет даты.

Применяется единообразно в `TaskCard` (канбан) и `ListView` (таблица). KPI «Просрочено сейчас» в `AnalyticsView` и блок «Просроченные» в `CalendarView` тоже считают только истинно прошедшие (сегодня — не просрочка).

### Карточки: фиксированные высоты
Чтобы все карточки на канбане были одинаковой высоты независимо от длины контента:
- Заголовок: `line-clamp-2 min-h-[2.5rem]` (всегда место под 2 строки)
- Описание: `line-clamp-3 min-h-[3rem]` (всегда место под 3 строки)
- Превью описания всегда отображается, даже если описания нет (пустое место).

Это касается и `TaskCard`, и `ProjectCard` — они одного размера.

### Реалтайм + оптимистичные обновления
- Все хуки `useTasks`/`useProjects`/`useComments`/`useTags` подписываются на `postgres_changes`.
- Optimistic update: после `setX(prev => ...)` сразу видно изменение, потом синк с сервером.
- Клиент Supabase в каждом хуке мемоизирован через `useMemo` (иначе пересоздавался бы при каждом рендере).

### Виды и URL
- На `/tasks` и `/projects` вид переключается через `?view=xxx` (`useSearchParams`).
- Sidebar (Desktop): подпункты видов под активным разделом, кликают на ссылки с `?view=`.
- Mobile: `MobileViewTabs` в шапке страницы (sidebar свёрнут в bottom nav). Реализован как сегментированный контрол (iOS-стиль): серая дорожка-трек с равными по ширине сегментами через `grid` (`gridTemplateColumns: repeat(N, 1fr)`, где N = число видов). Не скроллится горизонтально — все вкладки (4 у Задач, 2 у Проектов) всегда влезают по ширине экрана. Активная вкладка — белая «таблетка» с тенью.
- Страницы используют `<Suspense>` обёртки для `useSearchParams` (требование Next 14).

### Cross-navigation (Задача ↔ Проект)
- URL-параметры `?open=<id>` и `?create=<projectId>` на обеих страницах.
- В модалке задачи имя проекта — кликабельная ссылка → `router.push('/projects?open=<id>')`.
- В модалке проекта список задач — кликабельные строки → `router.push('/tasks?open=<id>')`.
- Кнопка «+ Создать задачу в проекте» внутри ProjectModal → `router.push('/tasks?create=<projectId>')`.
- Страницы читают URL-параметр в `useEffect`, открывают модалку, затем чистят URL через `router.replace`.

### Audit-комментарии (история изменений)
- Каждое изменение задачи через `handleUpdate` сравнивается с предыдущим состоянием через `diffTask.ts`.
- Если есть отличия → автоматически вставляется комментарий с `kind: 'audit'`, автор — `currentUser.assignee`.
- Audit-комментарии рендерятся курсивом, серее, без аватарки, без кнопки удаления.
- В счётчике «Комментарии (N)» учитываются только user-комментарии.
- Drag-and-drop статуса проходит через тот же wrapper → тоже логируется.

### Гант (иерархический)
- Только на странице **Проектов** (на Задачах Ганта нет).
- Каждая строка-проект → ниже сабстроки задач этого проекта.
- **Проект не показывает свою полоску** — только задачи под ним рисуют бары. Это даёт визуально чёткое «что делается в рамках проекта».
- Задачи без дат, проекты совсем без дат и без датированных задач → в сайдбаре «Без дат».
- Орфанные задачи (`project_id = null`) на Гант **не выводятся** — пользователь хочет видеть только проекты и их задачи. Бесхозные смотрят в Канбане/Списке.

### Аналитика (внутри Задач)

- Вкладка `?view=analytics` на странице `/tasks` (не отдельный раздел в сайдбаре).
- Реализована в `AnalyticsView.tsx` через `recharts`.
- Свой фильтр **Период**: Эта неделя / Этот месяц / Период (произвольный диапазон с двумя date-input). Кнопки периода и date-input выровнены по высоте 40px. Не путать с фильтрами `TaskFilters` (категория, ответственный, теги) — они применяются ДО передачи задач в `AnalyticsView`, период применяется ВНУТРИ.

Семантика метрик:
- **Создано за период** — задачи с `created_at` в окне периода
- **Закрыто за период** — задачи со статусом `done` чей `updated_at` в периоде (мы не храним отдельный `closed_at`, поэтому приближение)
- **В процессе сейчас** — текущий снимок, count of `status='in_progress'`, НЕ зависит от периода
- **Просрочено сейчас** — текущий снимок, НЕ зависит от периода

Виджеты:
- 4 KPI-карточки (см. выше)
- Donut «По статусам» — распределение задач созданных в периоде
- Donut «По ответственным» — то же
- Stacked bar «Создано задач (по дням/неделям/месяцам)» — ширина бакета подбирается автоматически по длине периода
- Список «Просроченные сейчас» — кликабельный, открывает задачу
- Список «Топ тегов» — горизонтальные бары пропорциональные количеству

Для Проектов аналитика пока не реализована — это отдельная задача.

### Срезы периодов (Календарь и Гант)
Оба компонента имеют одинаковую тулбар-структуру:
- Вкладки **Сегодня / Неделя / Месяц** (3 кнопки)
- ← Дата →, кнопка «Сегодня» справа
- Навигация шагает соответствующим интервалом (1 день / 1 неделя / 1 месяц)

Календарь:
- **Сегодня**: agenda — список задач на дату + блок «Просроченные» если открыт реальный «сегодня»
- **Неделя**: 7 колонок-дней (Пн-Вс)
- **Месяц**: классический 7×6 grid. На десктопе (md+) ячейка показывает чипы с названиями задач (клик → задача). На мобиле (<md) ячейка показывает задачи цветными точками (по приоритету), тап по ячейке открывает **день-шит** (`DaySheet` на базе `Modal`, bottom-sheet) — список задач этого дня, клик по задаче открывает её.

Гант:
- **Сегодня**: 7 дней начиная с anchor, `DAY_WIDTH = 56px`
- **Неделя**: текущая неделя (Пн-Вс), `DAY_WIDTH = 80px`
- **Месяц**: текущий месяц, `DAY_WIDTH = 32px`
- Бары клипуются к видимому диапазону, точки центрируются в свой день.

### Логика ответственного (м.008 — множественные)

Задачи и проекты имеют `assignees: Assignee[]` — можно отметить обоих, одного или никого. Привычки остаются с одним `assignee` (= создатель, индивидуально).

- **Личные** (category=personal) — `assignees` необязательны. Loose-таски (пустой массив) видны как свои у каждого в его «Личное».
- **Семейные** (category=family) — нужно отметить хотя бы одного. Если выбраны оба — задача появляется в «Личное» у каждого.
- При создании новой задачи/проекта `assignees` по умолчанию = `[currentUser.assignee]` (тот, кто сейчас залогинен).
- UI выбора — `<AssigneePicker>` (чип-тогглер): два чипа `Никита` / `Галочка`, click toggles.
- Фильтр по ответственному в `applyTaskFilters`/`applyProjectFilters` использует `assignees.includes(effectiveAssignee)` вместо строгого `===`. Для personal-категории пустой массив всё ещё разрешён (loose).
- Аудит-комментарии: `diffTask` выводит «Добавлен ответственный: …» / «Убран ответственный: …».
- Display: `assignees.map(a => ASSIGNEES[a].label).join(' + ')` — например `Никита + Галочка`.

### Поле `start_date` у задач = «Отложить до» (snooze)

`start_date` у задач **перепрофилировано** из «дата начала» в «отложить до» (поле в БД то же, изменилась семантика в UI и фильтрах). Задача с `start_date` в будущем — «отложенная» (`isDeferred(task)` в `lib/dueStatus.ts`):
- **Не показывается в «Сегодня»** (исключена из секций «Просрочено» и «На сегодня»).
- **Не попадает в дайджесты** (м.022: фильтр `start_date is null or start_date <= current_date` в утреннем и вечернем).
- **Помечена бейджем `💤 до DD.MM`** в `TaskCard`, `💤` в `ListView` и модалке.
- Снова всплывает сама, когда наступает дата (`start_date <= today`).
- **Валидации `start_date ≤ due_date` больше нет** — главный кейс это «снузнуть уже просроченную задачу» (отложить до позже дедлайна). Хелпер `formatDeferShort(start_date)` → «9 июн».

У **проектов** `start_date` остаётся «началом» (для Ганта) — перепрофилирование только у задач.

### Валидация дат
- В `ProjectForm`: если `start_date > due_date` — красная ошибка под полями, submit заблокирован. (В `TaskForm` валидация убрана — см. «Отложить до» выше.)

### Теги
- Хранятся в отдельной таблице `tags` (имя + цвет). У задачи в столбце `tags text[]` — массив имён.
- Цвет резолвится в `TagChip` по имени из `allTags`.
- Создание тега в `TagPicker`: ввод имени + клик по цветному кружочку. Сохраняется в БД, появляется во всех других пикерах через Realtime.
- Удаление тега: в `TagPicker` кнопка «Изменить» включает режим управления — на чипах появляется ✕, клик → инлайн-подтверждение. `useTags.deleteTag` удаляет строку из `tags` **и** вычищает имя тега из `tags[]` всех задач (чтобы не оставалось «осиротевших» имён, рендерящихся серым).

### Удаление проекта
- Confirm: «Проект будет удалён. Связанные задачи останутся, но потеряют привязку.»
- `project_id` в задачах становится `null` (через `ON DELETE SET NULL` в схеме).

### Привычки (регулярные задачи)
Отдельный раздел `/habits` (иконка 🔁 в навигации, под Проектами). Намеренно **не** часть канбана задач — регулярные дела засоряли бы доску. Это модель «habit + чеклист», а не «материализация задач».

- **Модель:** `habits` (название, **иконка-эмодзи**, `schedule_type` + `weekdays int[]` + `monthdays int[]`, цвет из палитры тегов, `archived`, `assignee`, `category`) + `habit_logs` (по строке на выполненный день). **Наличие строки в `habit_logs` = выполнено**, отдельного флага `done` нет — снятие отметки удаляет строку. `unique(habit_id, date)` защищает от дублей.
- **Привычки индивидуальны:** категория в UI **не задаётся** (всегда `personal`, дефолт в БД с м.006), `assignee` автоматически = создатель (`currentUser.assignee`, передаётся в `HabitForm` как `defaultAssignee`, отдельного селекта нет). Страница показывает **только привычки текущего пользователя** (чужие смотреть незачем; фильтра по ответственному нет). Если email не распознан — показываются все (fallback, чтобы не было пусто).
- **Тоггл `Сегодня / Готово / Все`** в шапке страницы (дефолт — `Сегодня`). Состояние `scope` в `page.tsx`. Логика:
  - `Сегодня` — привычки запланированные на сегодня И ещё не отмеченные (`scheduledToday \ doneToday`).
  - `Готово` — запланированные на сегодня И уже отмеченные сегодня (`scheduledToday ∩ doneToday`).
  - `Все` — полный список привычек пользователя (используется для редактирования/удаления).
  - При тапе ✓ привычка автоматически перетекает из `Сегодня` в `Готово` через realtime-обновление `logs`. Снятие отметки возвращает обратно.
  - Контекстные пустые состояния (передаются в `HabitsView` через проп `emptyText`):
    - `Сегодня` без запланированных: «На сегодня привычек по расписанию нет»
    - `Сегодня` с запланированными, все выполнены: «Все привычки на сегодня выполнены 🎉»
    - `Готово` пустое: «Сегодня пока ничего не отмечено»
    - `Все` пустое: стандартное «Привычек пока нет — добавь первую через кнопку справа внизу»
- **Иконка:** колонка `habits.icon` (м.006) есть, но **emoji-пикер из UI убран** (визуально не зашёл) — в карточке всегда рисуется цветная точка. Поле зарезервировано на будущее; старые сохранённые иконки ещё отрисовываются в шапке модалки.
- **Расписание — три типа** (выбор в `HabitForm` через `SegmentedControl`):
  - `daily` — каждый день; `weekdays` и `monthdays` игнорируются.
  - `weekdays` — по конкретным дням недели (ISO 1=Пн…7=Вс), 7 кнопок-тогглов.
  - `monthdays` — по конкретным дням месяца (1..31), grid 7 колонок. Если в месяце нет выбранного числа (29 февраля) — привычка просто не появится в этот день.
- Хелпер `isHabitScheduledOn(habit, date)` в `lib/types.ts` инкапсулирует проверку по типу — используется и в `HabitsView` (рендер запланированных кружков и streak), и на странице (`scheduledToday` для scope-фильтра «Сегодня»/«Готово»).
- **Хук `useHabits`:** грузит активные (`archived=false`) привычки + все логи, подписан на оба `postgres_changes`. `toggleLog(habitId, date)` — оптимистично вставляет/удаляет лог. CRUD привычек по образцу `useProjects`.
- **`HabitsView`** — **карточки** (`max-w-2xl mx-auto`). Без общего тулбара навигации по периодам — anchor всегда `today`. Каждая карточка адаптируется под `schedule_type` своей привычки:
  - **`daily` / `weekdays`** → недельная полоса (запланированные дни текущей недели), компонент `WeekStrip`. Прогресс «N/M на неделе».
  - **`monthdays`** → месячный grid 7×N (тепловая карта текущего месяца), компонент `MonthGrid`. Прогресс «N/M за месяц».
  - Шапка: цветная точка + название + описание (1 строка) + 🔥streak + мини-прогресс-бар.
  - Состояния дня (`DayCircle`): выполнено (заливка цветом + ✓), сегодня-не-сделано (синяя обводка), **пропущено** (прошлый запланированный — красный пунктир, read-only), будущее (бледное, disabled). Клик доступен **только на сегодняшнем кружке** — поставить или снять отметку. Все прошлые дни (и выполненные, и пропущенные) read-only — летопись не редактируется.
- **Дальше (не сделано):** пауза/архив (колонка `archived` уже есть, UI нет), статистика (лучшая серия, % за месяц).
- **Streak** считается в `computeStreak`: идём назад по дням от сегодня, на каждом запланированном (через `isHabitScheduledOn`) дне проверяем лог; первый пропуск обрывает серию (лимит 366 дней).
- **`isoWeekday(date)`** в `types.ts` конвертит JS `getDay()` (0=Вс) в ISO (1=Пн…7=Вс): `((getDay()+6)%7)+1`. Используется внутри `isHabitScheduledOn` для типа `weekdays`.
- На странице — тоггл `Сегодня / Готово / Все` (см. выше), фильтров по категории/ответственному нет. Создание через `Fab label="Привычка"`. У раздела нет под-видов (`subs`), поэтому `MobileViewTabs` не рендерится.
- Удаление привычки (модалка → 🗑️ → confirm) каскадно сносит `habit_logs` (`ON DELETE CASCADE`).

### Фильтры — реализация

- Подписи через переиспользуемые `Field` и `Divider` внутри `TaskFilters` / `ProjectFilters`. Токены подписей, паддингов и контролов — см. раздел «Дизайн-система».
- Фильтры всегда видны inline — мобильное сворачивание убрано (после редизайна категории на 2 пункта и удаления фильтра Проект разгрузка стала достаточной, чтобы влезть в одну строку даже на мобиле).

### PWA
- `manifest.json` + service worker через next-pwa
- Иконки 192, 512, apple-touch-icon (180), favicon-16/32 + icon.svg
- `apple-mobile-web-app-capable` = yes, `statusBarStyle` = black-translucent
- На iPhone: Safari → Поделиться → На экран «Домой»

## Пустые состояния

| Экран | Текст |
|---|---|
| Пустая колонка канбана | «Задач нет» (без кнопки) |
| Пустая колонка проектов | «Проектов нет» (без кнопки) |
| Фильтр ничего не нашёл | «Ничего не найдено» + кнопка сброса |
| Гант без датированных | «Добавьте даты к проектам или их задачам чтобы увидеть таймлайн» |
| Календарь сегодня без задач | «Задач на сегодня нет» |

## Фильтры

Комбинируются по AND-логике.

**Задачи:**
- Категория: Личное / Семейное / Все (вкладки, дефолт `personal`).
  - **Личное** = `category=personal` + auto-scope на текущего пользователя (loose-тасок с `assignee=null` тоже видны как свои).
  - **Семейное** = `category=family`, ответственный задаётся явно через селект.
  - **Все** = любая категория, но `assignee=me` строго (для семейных). Loose-personal с null тоже видны.
- Ответственный: select (только в «Семейное»; в «Личное» и «Все» скрыт — авто-скоуп).
- Теги: мультиселект (chips из БД).
- Фильтра «Проект» нет — задачи проекта смотрят со страницы Проектов через модалку.

**Проекты:**
- Категория: вкладки Личное / Семейное / Все, та же логика и дефолты, что у задач.
- Ответственный: select

Сортировка:
- Канбан: per-column по приоритету
- Список: клик по заголовку колонки
- Календарь/Гант: переход по периодам

## Seed данные

**Проекты:**
- «Продать квартиру» — in_progress, personal
- «Вылечить зубы» — in_progress, personal

Теги больше не сидятся (создаются пользователем).

## Что намеренно не входит в scope

- Push-уведомления и напоминания
- Вложения / файлы
- ~~История изменений задач~~ → **есть** через audit-комментарии (см. выше)
- ~~Повторяющиеся задачи~~ → **есть** через раздел «Привычки» (см. ниже)
- Третий пользователь и более
- Мобильное нативное приложение
- ~~Аналитика~~ → **есть для задач** (см. раздел «Аналитика» выше), для проектов — TODO

## Текущие технические шероховатости

- В `next.config.mjs` отключены PWA в dev — обычно норм, но если service worker глючит — это причина
- `useTags` хук вызывается во многих местах независимо (TaskCard, TagChip-ы) — каждый создаёт свою подписку. Можно оптимизировать через единый Context, но пока работает
- Email-маппинг (nick/galya) хардкожен через env vars — если поменяется почта пользователя, нужно править и env vars в Vercel, и RLS-политики (миграции 002/004)
