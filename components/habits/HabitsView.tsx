'use client'

import { useState } from 'react'
import {
  startOfWeek, endOfWeek, addWeeks, addMonths, addDays,
  startOfMonth, endOfMonth, eachDayOfInterval,
  format, isSameDay, isSameWeek, isSameMonth, isAfter, startOfDay,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { isoWeekday, WEEKDAYS, type Habit, type HabitLog } from '@/lib/types'

type Mode = 'week' | 'month'

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

/** Кружок одного дня. size: 'lg' для недели, 'sm' для месяца. */
function DayCircle({
  date, done, color, today, future, label, onToggle, size = 'lg',
}: {
  date: Date
  done: boolean
  color: string
  today: Date
  future: boolean
  label?: string   // подпись внутри (число месяца) — для month-режима
  onToggle: () => void
  size?: 'lg' | 'sm'
}) {
  const isNow = isSameDay(date, today)
  const missed = !done && !future && !isNow
  const box = size === 'lg' ? 'h-9 w-9 sm:h-11 sm:w-11 text-base' : 'h-8 w-8 text-xs'

  const cls = done
    ? `${HABIT_BG[color] ?? HABIT_BG.blue} text-white shadow-sm`
    : future
      ? 'border border-gray-200 text-gray-400 opacity-60 dark:border-gray-700 dark:text-gray-600'
      : isNow
        ? 'border-2 border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-2 border-dashed border-red-300 text-red-400 dark:border-red-900/70 dark:text-red-500/70'

  const content = label !== undefined ? label : (done ? '✓' : missed ? '·' : '')

  return (
    <button
      onClick={() => !future && onToggle()}
      disabled={future}
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

      <div className="mt-2.5 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className={`h-full rounded-full ${HABIT_BG[habit.color] ?? HABIT_BG.blue} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="flex-shrink-0 text-[11px] tabular-nums text-gray-400">{doneCount}/{total} {unit}</span>
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
  const [mode, setMode] = useState<Mode>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const today = startOfDay(new Date())

  const doneByHabit = new Map<string, Set<string>>()
  for (const l of logs) {
    if (!doneByHabit.has(l.habit_id)) doneByHabit.set(l.habit_id, new Set())
    doneByHabit.get(l.habit_id)!.add(l.date)
  }

  // Диапазоны для текущего режима
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthStart = startOfMonth(anchor)
  const monthGrid = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  })

  const rangeLabel = mode === 'week'
    ? `${format(weekStart, 'd MMM', { locale: ru })} — ${format(addDays(weekStart, 6), 'd MMM', { locale: ru })}`
    : format(monthStart, 'LLLL yyyy', { locale: ru })

  const step = (dir: 1 | -1) =>
    setAnchor(a => (mode === 'week' ? addWeeks(a, dir) : addMonths(a, dir)))

  // «Сегодня» нужна, только если мы ушли с текущего периода
  const onCurrentPeriod = mode === 'week'
    ? isSameWeek(anchor, new Date(), { weekStartsOn: 1 })
    : isSameMonth(anchor, new Date())

  return (
    <div className="mx-auto max-w-2xl">
      {/* Тулбар: режим (view) + навигация по периоду */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          variant="view"
          value={mode}
          onChange={setMode}
          ariaLabel="Режим отображения"
          options={[
            { value: 'week',  label: 'Неделя' },
            { value: 'month', label: 'Месяц'  },
          ] as const}
        />
        <div className="flex items-center gap-1">
          <IconButton onClick={() => step(-1)} aria-label="Назад">←</IconButton>
          <span className="min-w-[8.5rem] text-center text-sm font-medium capitalize text-gray-900 dark:text-gray-100">{rangeLabel}</span>
          <IconButton onClick={() => step(1)} aria-label="Вперёд">→</IconButton>
          <Button
            variant="secondary"
            onClick={() => setAnchor(new Date())}
            disabled={onCurrentPeriod}
            className="ml-1"
          >
            Сегодня
          </Button>
        </div>
      </div>

      {habits.length === 0 ? (
        <EmptyState text={emptyText ?? 'Привычек пока нет — добавь первую через кнопку справа внизу'} />
      ) : (
        <div className="space-y-3">
          {habits.map(habit => {
            const doneSet = doneByHabit.get(habit.id) ?? new Set<string>()
            const streak = computeStreak(habit, doneSet)

            if (mode === 'week') {
              const scheduled = weekDays.filter(d => habit.weekdays.includes(isoWeekday(d)))
              const doneCount = scheduled.filter(d => doneSet.has(fmtKey(d))).length
              return (
                <div key={habit.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <button onClick={() => onOpen(habit)} className="block w-full text-left">
                    <HabitCardHeader habit={habit} streak={streak} doneCount={doneCount} total={scheduled.length} unit="на неделе" />
                  </button>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {scheduled.map(d => (
                      <div key={fmtKey(d)} className="flex flex-col items-center gap-1">
                        <span className={`text-[11px] uppercase ${isSameDay(d, today) ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                          {format(d, 'EEEEEE', { locale: ru })}
                        </span>
                        <DayCircle date={d} color={habit.color} today={today}
                          done={doneSet.has(fmtKey(d))} future={isAfter(startOfDay(d), today)}
                          onToggle={() => onToggle(habit.id, fmtKey(d))} />
                        <span className={`text-[11px] ${isSameDay(d, today) ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                          {format(d, 'd')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            // mode === 'month'
            const monthScheduled = monthGrid.filter(d => isSameMonth(d, monthStart) && habit.weekdays.includes(isoWeekday(d)))
            const doneCount = monthScheduled.filter(d => doneSet.has(fmtKey(d))).length
            return (
              <div key={habit.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <button onClick={() => onOpen(habit)} className="block w-full text-left">
                  <HabitCardHeader habit={habit} streak={streak} doneCount={doneCount} total={monthScheduled.length} unit="за месяц" />
                </button>
                {/* Заголовок дней недели */}
                <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                  {WEEKDAYS.map(d => (
                    <span key={d.value} className="text-[11px] uppercase text-gray-400">{d.short}</span>
                  ))}
                </div>
                {/* Сетка месяца */}
                <div className="mt-1 grid grid-cols-7 place-items-center gap-1">
                  {monthGrid.map(d => {
                    const inMonth = isSameMonth(d, monthStart)
                    const scheduled = habit.weekdays.includes(isoWeekday(d))
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
                        onToggle={() => onToggle(habit.id, fmtKey(d))} />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
