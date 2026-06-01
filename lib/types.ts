export type Status = 'todo' | 'in_progress' | 'done' | 'paused'
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
  assignee: Assignee | null
  due_date: string | null
  start_date: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  title: string
  description: string | null
  status: Status
  category: Category
  assignee: Assignee | null
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

// Регулярные задачи / привычки. Расписание — конкретные дни недели (ISO 1..7).
export interface Habit {
  id: string
  title: string
  description: string | null
  icon: string | null  // эмодзи (зарезервировано; пикер в UI убран — рисуем цветную точку)
  category: Category   // всегда 'personal' — привычки индивидуальны, в UI не задаётся
  assignee: Assignee | null  // = тот, кто создал привычку
  weekdays: number[]   // ISO weekday numbers 1=Пн … 7=Вс
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

export const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done', 'paused']
