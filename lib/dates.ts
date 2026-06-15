import { format, parseISO, isToday, isTomorrow, isYesterday, isSameYear } from 'date-fns'
import { ru } from 'date-fns/locale'

/**
 * Короткая дата для UI: «15 июн» если в текущем году, иначе «15 июн 2025».
 * Принимает ISO-строку (`yyyy-MM-dd` или полный timestamptz). Пустое/null → ''.
 */
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = parseISO(value)
  const fmt = isSameYear(d, new Date()) ? 'd MMM' : 'd MMM yyyy'
  return format(d, fmt, { locale: ru })
}

/**
 * Относительная дата для близких дней: «сегодня», «завтра», «вчера»;
 * иначе — `formatShortDate(value)` («15 июн» / «15 июн 2025»).
 *
 * Используется там, где важно подчеркнуть «сейчас» (карточки задач,
 * списки сегодняшнего и т.п.).
 */
export function formatRelativeDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = parseISO(value)
  if (isToday(d))     return 'сегодня'
  if (isTomorrow(d))  return 'завтра'
  if (isYesterday(d)) return 'вчера'
  return formatShortDate(value)
}
