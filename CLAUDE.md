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

## Project Structure

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # Страница входа
│   ├── (app)/
│   │   ├── tasks/page.tsx        # Задачи (Канбан / Список / Календарь)
│   │   ├── projects/page.tsx     # Проекты (Канбан / Гант)
│   │   └── layout.tsx            # Layout с навигацией + auth guard
│   ├── layout.tsx                # PWA metadata, viewport, icons
│   ├── globals.css               # Кастомные стили селектов и пр.
│   └── page.tsx                  # redirect → /tasks
├── components/
│   ├── tasks/
│   │   ├── KanbanBoard.tsx       # Канбан + DnD + state модалок
│   │   ├── KanbanColumn.tsx      # Колонка статуса + per-column priority sort
│   │   ├── TaskCard.tsx          # Карточка задачи (фикс. высота)
│   │   ├── TaskModal.tsx         # Модалка задачи (view + edit)
│   │   ├── TaskForm.tsx          # Форма создания/редактирования + dateError
│   │   ├── CommentSection.tsx    # Комментарии (user + audit разных стилей)
│   │   ├── TaskFilters.tsx       # Фильтры + rightAction-слот для +Задача
│   │   ├── ListView.tsx          # Вид таблицей с сортируемыми заголовками
│   │   ├── CalendarView.tsx      # Календарь со срезами Сегодня/Неделя/Месяц
│   │   └── GanttView.tsx         # (НЕ используется на странице задач; зарезервирован)
│   ├── projects/
│   │   ├── ProjectKanban.tsx     # Канбан проектов (stateless)
│   │   ├── ProjectCard.tsx       # Карточка проекта (фикс. высота, как у задач)
│   │   ├── ProjectModal.tsx      # Модалка проекта + ProjectForm (экспорт)
│   │   ├── ProjectFilters.tsx    # Фильтры + rightAction для +Проект
│   │   └── ProjectGantt.tsx      # Иерархический Гант: проекты + вложенные задачи
│   └── ui/
│       ├── Navigation.tsx        # Sidebar/bottom nav + экспорт MobileViewTabs
│       ├── StatusBadge.tsx
│       ├── PriorityBadge.tsx     # С цветной точкой + контрастный фон
│       ├── EmptyState.tsx
│       ├── ConfirmModal.tsx
│       ├── TagChip.tsx           # Цветной тег (resolve color по name из allTags)
│       └── TagPicker.tsx         # Мультиселект + создание нового тега + color picker
├── lib/
│   ├── supabase/{client,server,middleware}.ts  # Supabase клиенты + auth middleware
│   ├── hooks/
│   │   ├── useTasks.ts           # CRUD + Realtime
│   │   ├── useProjects.ts        # CRUD + Realtime
│   │   ├── useComments.ts        # CRUD + Realtime (вкл. kind)
│   │   ├── useTags.ts            # CRUD + Realtime
│   │   └── useCurrentUser.ts     # email → assignee (по env vars)
│   ├── diffTask.ts               # Утилита: разница старой и новой задачи → audit-строки
│   └── types.ts                  # Type-ы и enum-словари (STATUSES, PRIORITIES, etc.)
├── middleware.ts                 # Next.js middleware → updateSession
├── scripts/
│   ├── seed.ts                   # Сид: проекты по умолчанию
│   └── generate-icons.mjs        # Генерация PWA-иконок из SVG через sharp
├── supabase/migrations/
│   ├── 001_initial.sql           # Базовая схема + RLS + Realtime publications
│   ├── 002_fix_comment_policy.sql # RLS для real-email пользователей
│   ├── 003_tags_and_project_assignee.sql # Таблица tags + projects.assignee
│   └── 004_comment_kind.sql      # comments.kind ('user'/'audit')
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
SUPABASE_SERVICE_ROLE_KEY=              # только для seed-скрипта
NEXT_PUBLIC_NICK_EMAIL=                 # email Никиты для распознавания
NEXT_PUBLIC_GALYA_EMAIL=                # email Галочки для распознавания
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
  assignee text check (assignee in ('nick', 'galya')),  -- м.003
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
  assignee text check (assignee in ('nick', 'galya')),
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

-- Индексы
create index on tasks(status);
create index on tasks(category);
create index on tasks(project_id);
create index on tasks(due_date);
create index on comments(task_id);
create index on tags(name);
```

### RLS

- **tasks, projects, tags:** read+write для всех authenticated.
- **comments:** read+insert для всех, **delete** только своих *user*-комментариев (audit-комментарии неудаляемы). Поле `auth.email()` сверяется с реальными email-ами Никиты/Галочки (см. миграцию 002 и 004).

### Realtime

Все таблицы (`tasks`, `projects`, `comments`, `tags`) добавлены в `supabase_realtime` publication.

### Применение миграций

Через Supabase Dashboard → SQL Editor → выполнить файлы по порядку.

## Пользователи

Два пользователя в Supabase Auth. Соответствие email ↔ `assignee` (`nick` / `galya`) — через env vars `NEXT_PUBLIC_NICK_EMAIL` и `NEXT_PUBLIC_GALYA_EMAIL`. Хук `useCurrentUser` возвращает `{ assignee, email, loading }`.

Если email авторизованного пользователя не совпал ни с одним из env vars — на странице задач показывается жёлтое предупреждение.

## Статусы и значения

```typescript
export const STATUSES = {
  todo:        { label: 'Беклог',      color: 'gray'   },
  in_progress: { label: 'В процессе',  color: 'blue'   },
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

## Ключевые решения

### Канбан
- Drag & drop через `@dnd-kit` (работает на мобильном — через TouchSensor с delay).
- Кнопка «+» в шапке колонки создаёт задачу с предустановленным статусом.
- Внутри пустых колонок **нет** кнопок «+ Добавить» — статус сам по себе достаточно очевидный.
- Селект статуса из карточки убран (положение в колонке = статус). Менять статус — drag или модалка.

### Per-column priority sort
- В шапке каждой колонки канбана — стрелочка с 3 состояниями: `none` / `desc` (высокий сверху) / `asc` (низкий сверху). Цикл по клику.
- Состояние независимое для каждой колонки. Хранится в `Record<Status, PrioritySort>` в `KanbanBoard`.
- Глобального фильтра «Сортировка» в задачах нет (только в `ListView` через клик по заголовку колонки и в Календаре/Ганте — навигация по периодам).

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
- Mobile: `MobileViewTabs` в шапке страницы (sidebar свёрнут в bottom nav).
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
- Орфанные задачи (`project_id = null`) → группа «Без проекта».

### Срезы периодов (Календарь и Гант)
Оба компонента имеют одинаковую тулбар-структуру:
- Вкладки **Сегодня / Неделя / Месяц** (3 кнопки)
- ← Дата →, кнопка «Сегодня» справа
- Навигация шагает соответствующим интервалом (1 день / 1 неделя / 1 месяц)

Календарь:
- **Сегодня**: agenda — список задач на дату + блок «Просроченные» если открыт реальный «сегодня»
- **Неделя**: 7 колонок-дней (Пн-Вс)
- **Месяц**: классический 7×6 grid

Гант:
- **Сегодня**: 7 дней начиная с anchor, `DAY_WIDTH = 56px`
- **Неделя**: текущая неделя (Пн-Вс), `DAY_WIDTH = 80px`
- **Месяц**: текущий месяц, `DAY_WIDTH = 32px`
- Бары клипуются к видимому диапазону, точки центрируются в свой день.

### Логика ответственного
- **Личные задачи** (category=personal) — assignee необязателен.
- **Семейные задачи** (category=family) — assignee обязателен, форма не отправится без него (визуальный warn).
- При создании новой задачи `assignee` по умолчанию = `currentUser.assignee` (тот, кто сейчас залогинен).
- Та же логика для проектов: `ProjectForm` принимает `defaultAssignee`.

### Валидация дат
- В `TaskForm` и `ProjectForm`: если `start_date > due_date` — выводится красная ошибка под полями, рамки полей красные, кнопка submit заблокирована.

### Теги
- Хранятся в отдельной таблице `tags` (имя + цвет). У задачи в столбце `tags text[]` — массив имён.
- Цвет резолвится в `TagChip` по имени из `allTags`.
- Создание тега в `TagPicker`: ввод имени + клик по цветному кружочку. Сохраняется в БД, появляется во всех других пикерах через Realtime.

### Удаление проекта
- Confirm: «Проект будет удалён. Связанные задачи останутся, но потеряют привязку.»
- `project_id` в задачах становится `null` (через `ON DELETE SET NULL` в схеме).

### Дизайн-система: отступы и иерархия в панелях фильтров

| Размер | Tailwind | Когда применять |
|---|---|---|
| 6px  | `gap-1.5` | Между подписью и её значением |
| 20px | `gap-x-5` | Между фильтрами в одной группе |
| 32px | вертикальная черта `border-l h-6` | Между разными группами |
| 12px | `py-3` | Вертикальный паддинг панели фильтров |

- Подписи: `text-[11px] uppercase tracking-wide text-gray-400` — мельче и легче значений.
- Реализовано через переиспользуемые компоненты `Field` и `Divider` внутри `TaskFilters` / `ProjectFilters`.
- В обоих фильтрах есть `rightAction` prop — слот справа для кнопки **+ Задача** / **+ Проект**.

### Селекты (HTML `<select>`)
- Нативный chevron скрывается через `appearance: none` в `globals.css`.
- Кастомный chevron рисуется через `background-image` SVG с отступом 10px справа.
- Глобальное правило — отдельные классы не нужны.

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
- Категория: Все / Личное / Семейное (вкладки)
- Проект: select
- Ответственный: select
- Теги: мультиселект (chips из БД)

**Проекты:**
- Категория: вкладки
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
- Повторяющиеся задачи
- Третий пользователь и более
- Мобильное нативное приложение
- Аналитика (счётчики, отчёты) — пока убраны, появится отдельным разделом

## Текущие технические шероховатости

- В `next.config.mjs` отключены PWA в dev — обычно норм, но если service worker глючит — это причина
- `useTags` хук вызывается во многих местах независимо (TaskCard, TagChip-ы) — каждый создаёт свою подписку. Можно оптимизировать через единый Context, но пока работает
- Email-маппинг (nick/galya) хардкожен через env vars — если поменяется почта пользователя, нужно править и env vars в Vercel, и RLS-политики (миграции 002/004)
