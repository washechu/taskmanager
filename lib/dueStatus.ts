import { isBefore, isSameDay, parseISO, startOfDay, format } from 'date-fns'
import { ru } from 'date-fns/locale'

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

/**
 * Задача «отложена» (snooze): `start_date` задан и наступит строго в будущем.
 * Поле start_date перепрофилировано из «дата начала» в «отложить до» (м.007 поле
 * остаётся тем же, меняется только семантика в UI и фильтрах). Отложенная задача
 * не показывается в «Сегодня» и не считается просрочкой до наступления даты.
 * Выполненные задачи отложенными не считаются.
 */
export function isDeferred(task: { start_date: string | null; status: string }): boolean {
  if (!task.start_date || task.status === 'done') return false
  return isBefore(startOfDay(new Date()), parseISO(task.start_date))
}

/** Короткая подпись даты отсрочки: «9 июн». Пусто, если start_date нет. */
export function formatDeferShort(startDate: string | null): string {
  if (!startDate) return ''
  return format(parseISO(startDate), 'd MMM', { locale: ru })
}
