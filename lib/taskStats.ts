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

/**
 * Агрегатные TTM-метрики по списку задач, закрытых в периоде.
 *
 * Задача учитывается если `completed_at` попадает в [start, end] и есть
 * `start_date` (без него cycle/queue нельзя посчитать).
 *
 * Возвращает средние в днях (округление до 0.1):
 *   • cycle — completed_at - start_date
 *   • lead  — completed_at - created_at
 *   • queue — start_date    - created_at
 *
 * Если в периоде нет ни одной квалифицирующей задачи → все три null.
 * `count` — сколько задач реально попало в расчёт (для UI «по N задачам»).
 */
export interface AggregateTtm {
  cycle: number | null
  lead:  number | null
  queue: number | null
  count: number
}

export function aggregateTtm(tasks: Task[], rangeStart: Date, rangeEnd: Date): AggregateTtm {
  let cycleSum = 0, leadSum = 0, queueSum = 0, count = 0
  for (const t of tasks) {
    if (t.status !== 'done' || !t.completed_at || !t.start_date) continue
    const completed = parseISO(t.completed_at)
    if (completed < rangeStart || completed > rangeEnd) continue
    const cycle = differenceInCalendarDays(completed, parseISO(t.start_date))
    const lead  = differenceInCalendarDays(completed, parseISO(t.created_at))
    const queue = differenceInCalendarDays(parseISO(t.start_date), parseISO(t.created_at))
    cycleSum += cycle
    leadSum  += lead
    queueSum += queue
    count++
  }
  if (count === 0) return { cycle: null, lead: null, queue: null, count: 0 }
  return {
    cycle: Math.round((cycleSum / count) * 10) / 10,
    lead:  Math.round((leadSum  / count) * 10) / 10,
    queue: Math.round((queueSum / count) * 10) / 10,
    count,
  }
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
