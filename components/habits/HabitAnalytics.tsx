'use client'

import { useMemo, useState } from 'react'
import { addDays, startOfDay, format } from 'date-fns'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { isHabitScheduledOn, type Habit, type HabitLog } from '@/lib/types'
import {
  buildDoneSet,
  computeCompletionRate,
  computeCurrentStreak,
} from '@/lib/habitStats'

type Period = 'week' | 'month' | 'quarter'

const PERIOD_DAYS: Record<Period, number> = {
  week: 7, month: 30, quarter: 90,
}

const PERIOD_OPTIONS = [
  { value: 'week'    as const, label: 'Неделя'   },
  { value: 'month'   as const, label: 'Месяц'    },
  { value: 'quarter' as const, label: '3 месяца' },
]

interface HabitAnalyticsProps {
  habits: Habit[]
  logs: HabitLog[]
  onHabitOpen: (habit: Habit) => void
}

/**
 * Сводная аналитика по всем привычкам пользователя.
 *
 * 3 блока:
 *   1. Сегмент периода (неделя/месяц/3 месяца)
 *   2. KPI: суммарный completion rate за период — одна большая цифра
 *   3. Leaderboard: список привычек с серией и % за период, по убыванию %
 *
 * Все расчёты — через lib/habitStats: переиспользуем те же функции, что и
 * в HabitModal.
 */
export function HabitAnalytics({ habits, logs, onHabitOpen }: HabitAnalyticsProps) {
  const [period, setPeriod] = useState<Period>('month')
  const days = PERIOD_DAYS[period]

  const rows = useMemo(() => {
    return habits.map(h => {
      const doneSet = buildDoneSet(h.id, logs)
      return {
        habit:   h,
        rate:    computeCompletionRate(h, doneSet, days),
        streak:  computeCurrentStreak(h, doneSet),
      }
    })
  }, [habits, logs, days])

  // Сводный KPI: sum done / sum scheduled по всем привычкам за период
  const overall = useMemo(() => {
    const today = startOfDay(new Date())
    let scheduled = 0
    let done = 0
    for (const h of habits) {
      const doneSet = buildDoneSet(h.id, logs)
      for (let i = 0; i < days; i++) {
        const d = addDays(today, -i)
        if (!isHabitScheduledOn(h, d)) continue
        scheduled++
        if (doneSet.has(format(d, 'yyyy-MM-dd'))) done++
      }
    }
    return { scheduled, done, rate: scheduled === 0 ? null : Math.round(done / scheduled * 100) }
  }, [habits, logs, days])

  // Сортировка leaderboard: по % убыванию, null'ы в хвост
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.rate === null && b.rate === null) return 0
      if (a.rate === null) return 1
      if (b.rate === null) return -1
      return b.rate - a.rate
    })
  }, [rows])

  if (habits.length === 0) {
    return <EmptyState text="Создай первую привычку, чтобы увидеть аналитику" />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <SegmentedControl
        variant="view"
        fullWidth
        value={period}
        onChange={setPeriod}
        ariaLabel="Период"
        options={PERIOD_OPTIONS}
      />

      <OverallCard rate={overall.rate} done={overall.done} scheduled={overall.scheduled} />

      <Leaderboard rows={sorted} onHabitOpen={onHabitOpen} />
    </div>
  )
}

function OverallCard({ rate, done, scheduled }: { rate: number | null; done: number; scheduled: number }) {
  const color =
    rate === null    ? 'text-gray-400' :
    rate >= 70       ? 'text-green-600  dark:text-green-400' :
    rate >= 40       ? 'text-yellow-600 dark:text-yellow-400' :
                       'text-red-600    dark:text-red-400'
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="text-xs uppercase tracking-wide text-gray-400">Выполнено за период</div>
      <div className={`mt-2 text-5xl font-bold tabular-nums ${color}`}>
        {rate === null ? '—' : `${rate}%`}
      </div>
      {scheduled > 0 && (
        <div className="mt-1 text-xs text-gray-400">
          {done} из {scheduled} запланированных
        </div>
      )}
    </div>
  )
}

const DOT_COLOR: Record<string, string> = {
  gray:   'bg-gray-400',
  red:    'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-400',
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  purple: 'bg-purple-500',
  pink:   'bg-pink-500',
}

function Leaderboard({
  rows, onHabitOpen,
}: {
  rows: { habit: Habit; rate: number | null; streak: number }[]
  onHabitOpen: (habit: Habit) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-gray-100 px-4 py-2 text-[11px] uppercase tracking-wide text-gray-400 dark:border-gray-800">
        <span>Привычка</span>
        <span className="text-right">🔥</span>
        <span className="w-12 text-right">%</span>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map(({ habit, rate, streak }) => {
          const rateColor =
            rate === null ? 'text-gray-400' :
            rate >= 70    ? 'text-green-600  dark:text-green-400' :
            rate >= 40    ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600    dark:text-red-400'
          return (
            <li key={habit.id}>
              <button
                type="button"
                onClick={() => onHabitOpen(habit)}
                className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${DOT_COLOR[habit.color] ?? DOT_COLOR.blue}`} />
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {habit.title}
                  </span>
                </span>
                <span className={`text-sm tabular-nums ${streak === 0 ? 'text-gray-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {streak}
                </span>
                <span className={`w-12 text-right text-sm font-semibold tabular-nums ${rateColor}`}>
                  {rate === null ? '—' : `${rate}%`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
