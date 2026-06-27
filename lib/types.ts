export type Status = 'todo' | 'in_progress' | 'done' | 'paused' | 'cancelled'
export type Priority = 'high' | 'medium' | 'low'
export type Category = 'personal' | 'family'
export type Assignee = 'nick' | 'galya'

export interface Task {
  id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  category: Category
  project_id: string | null
  /** Список ответственных. Пустой массив = ничей (loose). м.008 */
  assignees: Assignee[]
  due_date: string | null
  start_date: string | null
  tags: string[]
  /** Кто предложил задачу (для семейных с двумя участниками). м.009 */
  invited_by: Assignee | null
  /** Статус ответа на предложение. м.009 */
  invite_status: 'none' | 'pending' | 'accepted' | 'tentative' | 'declined'
  /** Когда задача была первый раз закрыта (status='done'). Выставляется
   *  DB-триггером, не перезаписывается при повторных переходах. м.026 */
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  title: string
  description: string | null
  status: Status
  category: Category
  /** Список ответственных. Пустой массив = ничей. м.008 */
  assignees: Assignee[]
  start_date: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  task_id: string
  author: Assignee
  text: string
  kind: 'user' | 'audit'
  created_at: string
}

export const STATUSES: Record<Status, { label: string; color: string }> = {
  todo:        { label: 'Беклог',      color: 'gray'   },
  in_progress: { label: 'В процессе',  color: 'yellow' },
  done:        { label: 'Готово',      color: 'green'  },
  paused:      { label: 'Остановлено', color: 'orange' },
  cancelled:   { label: 'Отменено',    color: 'slate'  },
}

export const PRIORITIES: Record<Priority, { label: string; color: string }> = {
  high:   { label: 'Высокий', color: 'red'    },
  medium: { label: 'Средний', color: 'yellow' },
  low:    { label: 'Низкий',  color: 'green'  },
}

export const CATEGORIES: Record<Category, { label: string; icon: string }> = {
  personal: { label: 'Личное',   icon: '👤' },
  family:   { label: 'Семейное', icon: '👫' },
}

export const ASSIGNEES: Record<Assignee, { label: string }> = {
  nick:  { label: 'Никита'  },
  galya: { label: 'Галочка' },
}

export interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

// Тип расписания привычки.
// - daily      — каждый день; weekdays/monthdays игнорируются
// - weekdays   — по конкретным дням недели (ISO 1=Пн … 7=Вс)
// - monthdays  — по конкретным дням месяца (1..31)
export type HabitScheduleType = 'daily' | 'weekdays' | 'monthdays'

// Регулярные задачи / привычки.
export interface Habit {
  id: string
  title: string
  description: string | null
  icon: string | null  // эмодзи (зарезервировано; пикер в UI убран — рисуем цветную точку)
  category: Category   // всегда 'personal' — привычки индивидуальны, в UI не задаётся
  assignee: Assignee | null  // = тот, кто создал привычку
  schedule_type: HabitScheduleType
  weekdays: number[]   // используется только для type='weekdays'
  monthdays: number[]  // используется только для type='monthdays'
  color: string        // палитра TAG_COLORS
  archived: boolean
  created_at: string
  updated_at: string
}

// Наличие лога = привычка выполнена в этот день.
export interface HabitLog {
  id: string
  habit_id: string
  date: string         // yyyy-MM-dd
  created_at: string
}

export const WEEKDAYS: { value: number; short: string; label: string }[] = [
  { value: 1, short: 'Пн', label: 'Понедельник' },
  { value: 2, short: 'Вт', label: 'Вторник'     },
  { value: 3, short: 'Ср', label: 'Среда'       },
  { value: 4, short: 'Чт', label: 'Четверг'     },
  { value: 5, short: 'Пт', label: 'Пятница'     },
  { value: 6, short: 'Сб', label: 'Суббота'     },
  { value: 7, short: 'Вс', label: 'Воскресенье' },
]

/** Запланирована ли привычка на эту дату по её расписанию. */
export function isHabitScheduledOn(habit: Habit, date: Date): boolean {
  if (habit.schedule_type === 'daily') return true
  if (habit.schedule_type === 'monthdays') return habit.monthdays.includes(date.getDate())
  // weekdays — дефолт и backwards-compat для существующих записей
  return habit.weekdays.includes(isoWeekday(date))
}

/** JS Date → ISO weekday (1=Пн … 7=Вс) */
export const isoWeekday = (d: Date): number => ((d.getDay() + 6) % 7) + 1

export const TAG_COLORS: Record<string, { label: string; bg: string; text: string }> = {
  gray:   { label: 'Серый',     bg: 'bg-gray-100   dark:bg-gray-800',   text: 'text-gray-700   dark:text-gray-300'   },
  red:    { label: 'Красный',   bg: 'bg-red-100    dark:bg-red-950',    text: 'text-red-700    dark:text-red-300'    },
  orange: { label: 'Оранжевый', bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300' },
  yellow: { label: 'Жёлтый',    bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-300' },
  green:  { label: 'Зелёный',   bg: 'bg-green-100  dark:bg-green-950',  text: 'text-green-700  dark:text-green-300'  },
  blue:   { label: 'Синий',     bg: 'bg-blue-100   dark:bg-blue-950',   text: 'text-blue-700   dark:text-blue-300'   },
  purple: { label: 'Фиолет.',   bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300' },
  pink:   { label: 'Розовый',   bg: 'bg-pink-100   dark:bg-pink-950',   text: 'text-pink-700   dark:text-pink-300'   },
}

/**
 * Все статусы в каноническом порядке — используется там, где cancelled
 * тоже надо показывать (StatusMenu, селект в форме задачи/проекта, ListView).
 */
export const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done', 'paused', 'cancelled']

/**
 * Статусы, у которых есть колонка в Канбане. `cancelled` сюда НЕ входит:
 * отменённые задачи не отображаются в канбане, доступ только через
 * StatusMenu / форму / тоггл «Отменённые» в Списке.
 *
 * `as const` нужен, чтобы `(typeof KANBAN_STATUSES)[number]` сужался до
 * литеральных значений (а не до Status), и Record<KanbanStatus, ...> в
 * KanbanBoard.tsx не требовал ключ 'cancelled'.
 */
export const KANBAN_STATUSES = ['todo', 'in_progress', 'done', 'paused'] as const satisfies readonly Status[]
export type KanbanStatus = (typeof KANBAN_STATUSES)[number]

/**
 * Статусы, у которых задача считается «активной» (требует внимания, может
 * быть просроченной). `done`, `paused`, `cancelled` — НЕ активные:
 * done сделан, paused «вернёмся, не торопит», cancelled решён как «нет».
 * Используется в lib/dueStatus и в SQL-дайджестах (см. м.029).
 */
export const ACTIVE_STATUSES: Status[] = ['todo', 'in_progress']
