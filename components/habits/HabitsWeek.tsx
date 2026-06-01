'use client'

import { useState } from 'react'
import {
  startOfWeek, addWeeks, addDays, format, isToday, isSameDay, isAfter, startOfDay,
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

const fmtKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** Серия: сколько подряд запланированных дней подряд выполнено, считая назад от сегодня. */
function computeStreak(habit: Habit, doneSet: Set<string>): number {
  if (habit.weekdays.length === 0) return 0
  let streak = 0
  let cursor = startOfDay(new Date())
  // не более года назад
  for (let i = 0; i < 366; i++) {
    if (habit.weekdays.includes(isoWeekday(cursor))) {
      if (doneSet.has(fmtKey(cursor))) streak++
      else break
    }
    cursor = addDays(cursor, -1)
  }
  return streak
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
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = startOfDay(new Date())

  // Быстрый поиск отметок по habit_id
  const doneByHabit = new Map<string, Set<string>>()
  for (const l of logs) {
    if (!doneByHabit.has(l.habit_id)) doneByHabit.set(l.habit_id, new Set())
    doneByHabit.get(l.habit_id)!.add(l.date)
  }

  if (habits.length === 0) {
    return (
      <EmptyState text="Привычек пока нет — добавь первую через кнопку справа внизу" />
    )
  }

  return (
    <div>
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

      <div className="overflow-x-auto">
        <div className="min-w-[34rem]">
          {/* Заголовок: дни недели */}
          <div className="flex items-center border-b border-gray-200 pb-2 dark:border-gray-800">
            <div className="flex-1 min-w-0" />
            <div className="flex gap-1">
              {days.map(d => (
                <div key={d.toISOString()} className="w-10 text-center">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">
                    {format(d, 'EEEEEE', { locale: ru })}
                  </div>
                  <div className={`text-xs font-medium ${
                    isToday(d) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {format(d, 'd')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Строки привычек */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {habits.map(habit => {
              const doneSet = doneByHabit.get(habit.id) ?? new Set<string>()
              const streak = computeStreak(habit, doneSet)
              // прогресс за неделю: запланированные дни ≤ сегодня
              const planned = days.filter(d => habit.weekdays.includes(isoWeekday(d)) && !isAfter(startOfDay(d), today))
              const doneCount = planned.filter(d => doneSet.has(fmtKey(d))).length

              return (
                <div key={habit.id} className="flex items-center py-2.5">
                  <button
                    onClick={() => onOpen(habit)}
                    className="flex-1 min-w-0 pr-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${HABIT_BG[habit.color] ?? HABIT_BG.blue}`} />
                      <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{habit.title}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 pl-[1.125rem] text-[11px] text-gray-400">
                      <span>{doneCount}/{planned.length || habit.weekdays.length} за неделю</span>
                      {streak > 0 && <span className="text-orange-500">🔥 {streak}</span>}
                    </div>
                  </button>

                  <div className="flex gap-1">
                    {days.map(d => {
                      const scheduled = habit.weekdays.includes(isoWeekday(d))
                      const dayStart = startOfDay(d)
                      const future = isAfter(dayStart, today)
                      const key = fmtKey(d)
                      const done = doneSet.has(key)

                      if (!scheduled) {
                        return (
                          <div key={key} className="flex h-10 w-10 items-center justify-center">
                            <span className="h-1 w-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                          </div>
                        )
                      }
                      return (
                        <div key={key} className="flex h-10 w-10 items-center justify-center">
                          <button
                            onClick={() => !future && onToggle(habit.id, key)}
                            disabled={future}
                            aria-label={`${habit.title} — ${key}`}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all ${
                              done
                                ? `${HABIT_BG[habit.color] ?? HABIT_BG.blue} text-white`
                                : future
                                  ? 'border border-dashed border-gray-200 text-transparent dark:border-gray-700'
                                  : `border-2 ${isSameDay(d, today) ? 'border-blue-400' : 'border-gray-300 dark:border-gray-600'} text-gray-300 hover:border-blue-400 dark:text-gray-600`
                            }`}
                          >
                            {done ? '✓' : ''}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
