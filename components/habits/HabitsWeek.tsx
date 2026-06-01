'use client'

import { useState } from 'react'
import {
  startOfWeek, addWeeks, addDays, format, isSameDay, isAfter, startOfDay,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { EmptyState } from '@/components/ui/EmptyState'
import { isoWeekday, type Habit, type HabitLog } from '@/lib/types'

// Заливка выполненной ячейки по цвету привычки
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
const HABIT_DOT: Record<string, string> = {
  gray:   'bg-gray-400',
  red:    'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-400',
  green:  'bg-green-500',
  blue:   'bg-blue-600',
  purple: 'bg-purple-500',
  pink:   'bg-pink-500',
}
const HABIT_BAR: Record<string, string> = HABIT_BG

const fmtKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** Серия: сколько подряд запланированных дней подряд выполнено, считая назад от сегодня. */
function computeStreak(habit: Habit, doneSet: Set<string>): number {
  if (habit.weekdays.length === 0) return 0
  let streak = 0
  let cursor = startOfDay(new Date())
  for (let i = 0; i < 366; i++) {
    if (habit.weekdays.includes(isoWeekday(cursor))) {
      if (doneSet.has(fmtKey(cursor))) streak++
      else break
    }
    cursor = addDays(cursor, -1)
  }
  return streak
}

function DayCell({
  date, done, color, today, future, onToggle,
}: {
  date: Date
  done: boolean
  color: string
  today: Date
  future: boolean
  onToggle: () => void
}) {
  const isNow = isSameDay(date, today)
  const missed = !done && !future && !isNow

  const circle = done
    ? `${HABIT_BG[color] ?? HABIT_BG.blue} text-white shadow-sm`
    : future
      ? 'border border-gray-200 text-transparent opacity-50 dark:border-gray-700'
      : isNow
        ? 'border-2 border-blue-500 text-blue-500 dark:text-blue-400'
        : 'border-2 border-dashed border-red-300 text-red-400 dark:border-red-900/70 dark:text-red-500/70' // пропущено

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-[11px] uppercase tracking-wide ${
        isNow ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-400'
      }`}>
        {format(date, 'EEEEEE', { locale: ru })}
      </span>
      <button
        onClick={() => !future && onToggle()}
        disabled={future}
        aria-label={fmtKey(date)}
        className={`flex h-11 w-11 items-center justify-center rounded-full text-base transition-all active:scale-90 disabled:cursor-default ${circle}`}
      >
        {done ? '✓' : missed ? '·' : ''}
      </button>
      <span className={`text-[11px] ${isNow ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
        {format(date, 'd')}
      </span>
    </div>
  )
}

export function HabitsWeek({
  habits,
  logs,
  onToggle,
  onOpen,
}: {
  habits: Habit[]
  logs: HabitLog[]
  onToggle: (habitId: string, date: string) => void
  onOpen: (habit: Habit) => void
}) {
  const [anchor, setAnchor] = useState(() => new Date())
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = startOfDay(new Date())

  const doneByHabit = new Map<string, Set<string>>()
  for (const l of logs) {
    if (!doneByHabit.has(l.habit_id)) doneByHabit.set(l.habit_id, new Set())
    doneByHabit.get(l.habit_id)!.add(l.date)
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Toolbar: навигация по неделям */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAnchor(a => addWeeks(a, -1))}
            className="rounded-lg px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Предыдущая неделя"
          >←</button>
          <span className="min-w-[9rem] text-center text-sm font-medium text-gray-700 dark:text-gray-200">
            {format(weekStart, 'd MMM', { locale: ru })} — {format(addDays(weekStart, 6), 'd MMM', { locale: ru })}
          </span>
          <button
            onClick={() => setAnchor(a => addWeeks(a, 1))}
            className="rounded-lg px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Следующая неделя"
          >→</button>
        </div>
        <button
          onClick={() => setAnchor(new Date())}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Сегодня
        </button>
      </div>

      {habits.length === 0 ? (
        <EmptyState text="Привычек пока нет — добавь первую через кнопку справа внизу" />
      ) : (
        <div className="space-y-3">
          {habits.map(habit => {
            const doneSet = doneByHabit.get(habit.id) ?? new Set<string>()
            const streak = computeStreak(habit, doneSet)
            // Только запланированные дни этой недели, в порядке Пн→Вс
            const scheduledDays = weekDays.filter(d => habit.weekdays.includes(isoWeekday(d)))
            const total = scheduledDays.length
            const doneCount = scheduledDays.filter(d => doneSet.has(fmtKey(d))).length
            const pct = total ? Math.round((doneCount / total) * 100) : 0

            return (
              <div
                key={habit.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                {/* Шапка карточки */}
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => onOpen(habit)} className="flex min-w-0 items-center gap-2.5 text-left">
                    <span className={`h-3 w-3 flex-shrink-0 rounded-full ${HABIT_DOT[habit.color] ?? HABIT_DOT.blue}`} />
                    <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{habit.title}</span>
                  </button>
                  {streak > 0 && (
                    <span className="flex-shrink-0 text-xs font-medium text-orange-500">🔥 {streak}</span>
                  )}
                </div>

                {/* Прогресс недели */}
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-full rounded-full ${HABIT_BAR[habit.color] ?? HABIT_BAR.blue} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-400">
                    {doneCount}/{total} на неделе
                  </span>
                </div>

                {/* Дни (только запланированные) */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {scheduledDays.map(d => (
                    <DayCell
                      key={fmtKey(d)}
                      date={d}
                      color={habit.color}
                      today={today}
                      done={doneSet.has(fmtKey(d))}
                      future={isAfter(startOfDay(d), today)}
                      onToggle={() => onToggle(habit.id, fmtKey(d))}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
