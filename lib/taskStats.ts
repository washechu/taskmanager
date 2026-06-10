import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import type { Task } from './types'

/**
 * Короткий формат длительности в днях для бейджей: «<1», «3», «12».
 * Без суффикса «д» — единица измерения предполагается из заголовка раздела.
 * Отрицательные значения обрезаются до нуля.
 */
export function formatDays(days: number | null): string {
  if (days === null) return '—'
  if (days < 1) return '<1'
  return `${Math.max(0, Math.round(days))}`
}

/** Разница в днях между двумя date-like значениями (yyyy-MM-dd или ISO). */
function daysBetween(later: string | null, earlier: string | null): number | null {
  if (!later || !earlier) return null
  return differenceInCalendarDays(parseISO(later), parseISO(earlier))
}

const todayIso = () => startOfDay(new Date()).toISOString()

/**
 * TTM-метрики задачи. Семантика разная для разных статусов:
 *
 * In_progress:
 *   • inProgressDays = today - start_date          (сколько уже в работе)
 *   • totalDays      = today - created_at           (всего «жизни» задачи)
 *   • dueDelta       = due_date - today              (>0 запас, <0 просрочена)
 *
 * Done:
 *   • inProgressDays = completed_at - start_date     (cycle time)
 *   • totalDays      = completed_at - created_at     (lead time)
 *   • dueDelta       = due_date - completed_at       (>0 опередили, <0 опоздали)
 *
 * Todo / paused:
 *   • totalDays      = today - created_at
 *   • dueDelta       = due_date - today               (если есть)
 *   • inProgressDays = null
 */
export interface TaskStats {
  inProgressDays: number | null
  totalDays:      number | null
  dueDelta:       number | null
}

export function computeTaskStats(task: Task): TaskStats {
  const now    = todayIso()
  const endRef = task.status === 'done' && task.completed_at
    ? task.completed_at
    : now

  const inProgressDays = task.start_date
    ? daysBetween(endRef, task.start_date)
    : null

  const totalDays = daysBetween(endRef, task.created_at)

  // Для done: сравниваем дедлайн с фактическим закрытием. Для остальных —
  // с сегодня (отрицательное значение = просрочена).
  const dueRef = task.status === 'done' && task.completed_at ? task.completed_at : now
  const dueDelta = task.due_date ? daysBetween(task.due_date, dueRef) : null

  return { inProgressDays, totalDays, dueDelta }
}
