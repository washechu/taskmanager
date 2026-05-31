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
  created_at: string
}

export const STATUSES: Record<Status, { label: string; color: string }> = {
  todo:        { label: 'Не начато',   color: 'gray'   },
  in_progress: { label: 'В процессе', color: 'blue'   },
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
  nick:  { label: 'Ник'  },
  galya: { label: 'Галя' },
}

export const DEFAULT_TAGS = [
  'Джиу-джитсу', 'Выходные', 'Спорт', 'Дом', 'С Галей', 'Чарли',
]

export const STATUS_ORDER: Status[] = ['todo', 'in_progress', 'done', 'paused']
