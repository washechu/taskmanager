import { isBefore, isSameDay, parseISO, startOfDay } from 'date-fns'

export type DueStatus = 'overdue' | 'today' | 'future'

/**
 * Возвращает статус по due_date: «сгоревшая» (прошлый день),
 * «сегодня» (день ещё не закончился) или «в будущем».
 * `null` — нет дедлайна или задача уже сделана.
 */
export function dueStatus(task: { due_date: string | null; status: string }): DueStatus | null {
  if (!task.due_date || task.status === 'done') return null
  const today = startOfDay(new Date())
  const d = parseISO(task.due_date)
  if (isBefore(d, today)) return 'overdue'
  if (isSameDay(d, today)) return 'today'
  return 'future'
}

/** Мини-иконка для статуса: 🔥 (просрочено), ⚠️ (сегодня), '' иначе. */
export function dueIcon(s: DueStatus | null): string {
  if (s === 'overdue') return '🔥'
  if (s === 'today')   return '⚠️'
  return ''
}
