'use client'

import {
  startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval,
  format, isSameDay, isSameMonth, isAfter, startOfDay,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { EmptyState } from '@/components/ui/EmptyState'
import { isHabitScheduledOn, WEEKDAYS, type Habit, type HabitLog } from '@/lib/types'

const HABIT_BG: Record<string, string> = {
  gray:   'bg-gray-500',
  red:    'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green:  'bg-green-500',
  blue:   'bg-blue-600',
  purple: 'bg-purple-500',
  pink:   'bg-pink-500',
}
const HABIT_DOT: Record<string, string> = { ...HABIT_BG, yellow: 'bg-yellow-400', gray: 'bg-gray-400' }

const fmtKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** Серия: подряд выполненных запланированных дней, считая назад от сегодня. */
function computeStreak(habit: Habit, doneSet: Set<string>): number {
  let streak = 0
  let cursor = startOfDay(new Date())
  for (let i = 0; i < 366; i++) {
    if (isHabitScheduledOn(habit, cursor)) {
      if (doneSet.has(fmtKey(cursor))) streak++
      else break
    }
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Кружок одного дня. */
function DayCircle({
  date, done, color, today, future, onToggle, size = 'lg', label,
}: {
  date: Date
  done: boolean
  color: string
  today: Date
  future: boolean
  onToggle: () => void
  size?: 'lg' | 'sm'
  label?: string
}) {
  const isNow = isSameDay(date, today)
  const missed = !done && !future && !isNow

  const cls = done
    ? `${HABIT_BG[color] ?? HABIT_BG.blue} text-white shadow-sm`
    : future
      ? 'border border-gray-200 text-gray-400 opacity-60 dark:border-gray-700 dark:text-gray-600'
      : isNow
        ? 'border-2 border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-2 border-dashed border-red-300 text-red-400 dark:border-red-900/70 dark:text-red-500/70'

  const content = label !== undefined ? label : done ? '✓' : missed ? '·' : ''
  const box = size === 'lg' ? 'h-9 w-9 text-base sm:h-11 sm:w-11' : 'h-8 w-8 text-xs'

  // Прошлое read-only (ни поставить, ни снять задним числом). Кликается
  // только сегодня — поставить или снять при ошибочном тапе.
  const disabled = !isNow
  return (
    <button
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      aria-label={fmtKey(date)}
      className={`flex items-center justify-center rounded-full transition-all active:scale-90 disabled:cursor-default ${box} ${cls}`}
    >
      {content}
    </button>
  )
}

function HabitCardHeader({ habit, streak, doneCount, total, unit }: {
  habit: Habit; streak: number; doneCount: number; total: number; unit: string
}) {
  const pct = total ? Math.round((doneCount / total) * 100) : 0
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5 text-left">
          {habit.icon
            ? <span className="flex-shrink-0 text-lg leading-none">{habit.icon}</span>
            : <span className={`h-3 w-3 flex-shrink-0 rounded-full ${HABIT_DOT[habit.color] ?? HABIT_DOT.blue}`} />}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{habit.title}</div>
            {habit.description && (
              <div className="truncate text-xs text-gray-400">{habit.description}</div>
            )}
          </div>
        </div>
        {streak > 0 && <span className="flex-shrink-0 text-xs font-medium text-orange-500">🔥 {streak}</span>}
      </div>

      {total > 0 && (
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className={`h-full rounded-full ${HABIT_BG[habit.color] ?? HABIT_BG.blue} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-400">{doneCount}/{total} {unit}</span>
        </div>
      )}
    </>
  )
}

/** Недельная полоса (запланированные дни этой недели). Для daily/weekdays. */
function WeekStrip({ habit, doneSet, today, onToggle }: {
  habit: Habit; doneSet: Set<string>; today: Date; onToggle: (date: string) => void
}) {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const scheduled = weekDays.filter(d => isHabitScheduledOn(habit, d))

  if (scheduled.length === 0) {
    return <p className="mt-3 text-xs text-gray-400">На этой неделе нет запланированных дней</p>
  }
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {scheduled.map(d => (
        <div key={fmtKey(d)} className="flex flex-col items-center gap-1">
          <span className={`text-[11px] uppercase ${isSameDay(d, today) ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
            {format(d, 'EEEEEE', { locale: ru })}
          </span>
          <DayCircle date={d} color={habit.color} today={today}
            done={doneSet.has(fmtKey(d))} future={isAfter(startOfDay(d), today)}
            onToggle={() => onToggle(fmtKey(d))} />
          <span className={`text-[11px] ${isSameDay(d, today) ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
            {format(d, 'd')}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Месячный grid (тепловая карта). Для monthdays. */
function MonthGrid({ habit, doneSet, today, onToggle }: {
  habit: Habit; doneSet: Set<string>; today: Date; onToggle: (date: string) => void
}) {
  const monthStart = startOfMonth(today)
  const gridDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  })
  return (
    <>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map(d => (
          <span key={d.value} className="text-[11px] uppercase text-gray-400">{d.short}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 place-items-center gap-1">
        {gridDays.map(d => {
          const inMonth = isSameMonth(d, monthStart)
          const scheduled = isHabitScheduledOn(habit, d)
          if (!inMonth) return <span key={fmtKey(d)} className="h-8 w-8" />
          if (!scheduled) {
            return (
              <span key={fmtKey(d)} className="flex h-8 w-8 items-center justify-center text-xs text-gray-400 dark:text-gray-700">
                {format(d, 'd')}
              </span>
            )
          }
          return (
            <DayCircle key={fmtKey(d)} date={d} color={habit.color} today={today}
              done={doneSet.has(fmtKey(d))} future={isAfter(startOfDay(d), today)}
              label={format(d, 'd')} size="sm"
              onToggle={() => onToggle(fmtKey(d))} />
          )
        })}
      </div>
    </>
  )
}

export function HabitsView({
  habits, logs, onToggle, onOpen, emptyText,
}: {
  habits: Habit[]
  logs: HabitLog[]
  onToggle: (habitId: string, date: string) => void
  onOpen: (habit: Habit) => void
  emptyText?: string
}) {
  const today = startOfDay(new Date())

  const doneByHabit = new Map<string, Set<string>>()
  for (const l of logs) {
    if (!doneByHabit.has(l.habit_id)) doneByHabit.set(l.habit_id, new Set())
    doneByHabit.get(l.habit_id)!.add(l.date)
  }

  // Period scope для прогресс-бара:
  // - monthdays → текущий месяц
  // - daily / weekdays → текущая неделя
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  if (habits.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState text={emptyText ?? 'Привычек пока нет — добавь первую через кнопку справа внизу'} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {habits.map(habit => {
        const doneSet = doneByHabit.get(habit.id) ?? new Set<string>()
        const streak = computeStreak(habit, doneSet)
        const isMonthly = habit.schedule_type === 'monthdays'

        const periodDays = isMonthly ? monthDays : weekDays
        const scheduled = periodDays.filter(d => isHabitScheduledOn(habit, d))
        const doneCount = scheduled.filter(d => doneSet.has(fmtKey(d))).length
        const unit = isMonthly ? 'за месяц' : 'на неделе'

        return (
          <div key={habit.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <button onClick={() => onOpen(habit)} className="block w-full text-left">
              <HabitCardHeader habit={habit} streak={streak} doneCount={doneCount} total={scheduled.length} unit={unit} />
            </button>
            {isMonthly
              ? <MonthGrid habit={habit} doneSet={doneSet} today={today} onToggle={(d) => onToggle(habit.id, d)} />
              : <WeekStrip habit={habit} doneSet={doneSet} today={today} onToggle={(d) => onToggle(habit.id, d)} />}
          </div>
        )
      })}
    </div>
  )
}
