import { isBefore, isSameDay, parseISO, startOfDay } from 'date-fns'

export type DueStatus = 'overdue' | 'today' | 'future'

/**
 * Возвращает статус по due_date: «сгоревшая» (прошлый день),
 * «сегодня» (день ещё не закончился) или «в будущем».
 * `null` — нет дедлайна или задача не активна (done / paused / cancelled).
 *
 * paused: «вернёмся, не торопит» — не должна звать как просрочка
 *   (баг до м.029 — пользователь жаловался, что paused-задачи мелькают
 *   в утреннем дайджесте 🔥). cancelled — тем более.
 *
 * Это же правило симметрично применяется в SQL-дайджестах (м.029).
 */
export function dueStatus(task: { due_date: string | null; status: string }): DueStatus | null {
  if (!task.due_date) return null
  if (task.status === 'done' || task.status === 'paused' || task.status === 'cancelled') return null
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
