import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import { format } from 'date-fns'
import { isHabitScheduledOn, type Habit, type HabitLog } from './types'

const fmtKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** Максимальное окно итерации (1 год). Защищает от ухода в дебри истории. */
const MAX_DAYS_LOOKBACK = 366

/**
 * Текущая серия — подряд выполненных запланированных дней, считая назад
 * от сегодня. Первый запланированный пропуск обрывает серию. Дни без
 * расписания не считаются ни «за», ни «против».
 */
export function computeCurrentStreak(habit: Habit, doneSet: Set<string>): number {
  let streak = 0
  let cursor = startOfDay(new Date())
  for (let i = 0; i < MAX_DAYS_LOOKBACK; i++) {
    if (isHabitScheduledOn(habit, cursor)) {
      if (doneSet.has(fmtKey(cursor))) streak++
      else break
    }
    cursor = addDays(cursor, -1)
  }
  return streak
}

/**
 * Лучшая серия — самая длинная цепочка подряд выполненных запланированных
 * дней с момента создания привычки. Если привычка моложе MAX_DAYS_LOOKBACK,
 * стартуем от created_at, иначе откатываемся не дальше года.
 */
export function computeBestStreak(habit: Habit, doneSet: Set<string>): number {
  const today = startOfDay(new Date())
  const createdAt = startOfDay(parseISO(habit.created_at))
  const daysSinceCreated = differenceInCalendarDays(today, createdAt)
  const lookback = Math.min(MAX_DAYS_LOOKBACK, Math.max(daysSinceCreated, 0))

  let best = 0
  let run = 0
  let cursor = addDays(today, -lookback)
  while (cursor <= today) {
    if (isHabitScheduledOn(habit, cursor)) {
      if (doneSet.has(fmtKey(cursor))) {
        run++
        if (run > best) best = run
      } else {
        run = 0
      }
    }
    cursor = addDays(cursor, 1)
  }
  return best
}

/** Всего отметок привычки за всю историю. */
export function computeTotalCompletions(habitId: string, logs: HabitLog[]): number {
  return logs.reduce((acc, l) => acc + (l.habit_id === habitId ? 1 : 0), 0)
}

/**
 * % выполнения за последние `days` дней: `done / scheduled * 100`,
 * с округлением до целого. `null` — если за период не было запланировано
 * ни одного дня (свежесозданная привычка с расписанием, которое ещё не
 * наступило). Тогда показывать «—» вместо нуля.
 */
export function computeCompletionRate(
  habit: Habit,
  doneSet: Set<string>,
  days = 30,
): number | null {
  const today = startOfDay(new Date())
  let scheduled = 0
  let done = 0
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i)
    if (!isHabitScheduledOn(habit, d)) continue
    scheduled++
    if (doneSet.has(fmtKey(d))) done++
  }
  if (scheduled === 0) return null
  return Math.round((done / scheduled) * 100)
}

/** Шорткат: построить doneSet (yyyy-MM-dd) для конкретной привычки. */
export function buildDoneSet(habitId: string, logs: HabitLog[]): Set<string> {
  const s = new Set<string>()
  for (const l of logs) if (l.habit_id === habitId) s.add(l.date)
  return s
}
