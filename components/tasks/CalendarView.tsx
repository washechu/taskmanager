'use client'

import { useMemo, useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth,
  startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks,
  addDays, subDays, isToday, isPast,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import type { Task, Project } from '@/lib/types'

type Slice = 'today' | 'week' | 'month'

const SLICE_OPTIONS = [
  { value: 'today' as const, label: 'Сегодня' },
  { value: 'week'  as const, label: 'Неделя'  },
  { value: 'month' as const, label: 'Месяц'   },
]

interface CalendarViewProps {
  tasks: Task[]
  projects: Project[]
  onTaskOpen: (task: Task) => void
}

export function CalendarView({ tasks, projects, onTaskOpen }: CalendarViewProps) {
  const [slice, setSlice] = useState<Slice>('month')
  const [anchor, setAnchor] = useState(new Date()) // anchor date for navigation

  // Group tasks by due date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      if (!task.due_date) continue
      const arr = map.get(task.due_date) ?? []
      arr.push(task)
      map.set(task.due_date, arr)
    }
    return map
  }, [tasks])

  const undatedTasks = useMemo(() => tasks.filter(t => !t.due_date), [tasks])

  const goPrev = () => setAnchor(d =>
    slice === 'month' ? subMonths(d, 1) :
    slice === 'week'  ? subWeeks(d, 1)  :
                        subDays(d, 1))
  const goNext = () => setAnchor(d =>
    slice === 'month' ? addMonths(d, 1) :
    slice === 'week'  ? addWeeks(d, 1)  :
                        addDays(d, 1))
  const goToday = () => setAnchor(new Date())

  const title =
    slice === 'today' ? format(anchor, 'EEEE, d MMMM yyyy', { locale: ru }) :
    slice === 'week'  ? `Неделя с ${format(startOfWeek(anchor, { weekStartsOn: 1 }), 'd MMM', { locale: ru })}` :
                        format(anchor, 'LLLL yyyy', { locale: ru })

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          variant="view"
          value={slice}
          onChange={setSlice}
          ariaLabel="Срез календаря"
          options={SLICE_OPTIONS}
        />
        <div className="flex items-center gap-1">
          <IconButton onClick={goPrev} aria-label="Назад">←</IconButton>
          <h2 className="px-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          <IconButton onClick={goNext} aria-label="Вперёд">→</IconButton>
          <Button variant="secondary" onClick={goToday} className="ml-1">Сегодня</Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {slice === 'today' && <TodayView anchor={anchor} tasksByDate={tasksByDate} tasks={tasks} onTaskOpen={onTaskOpen} />}
          {slice === 'week'  && <WeekView  anchor={anchor} tasksByDate={tasksByDate} onTaskOpen={onTaskOpen} />}
          {slice === 'month' && <MonthView anchor={anchor} tasksByDate={tasksByDate} onTaskOpen={onTaskOpen} />}
        </div>

        {/* Sidebar with undated tasks */}
        {undatedTasks.length > 0 && (
          <div className="flex max-h-64 w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:max-h-none lg:w-64">
            <div className="border-b border-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
              Без даты ({undatedTasks.length})
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
              {undatedTasks.map(t => (
                <button
                  key={t.id}
                  onClick={() => onTaskOpen(t)}
                  className="block w-full rounded-lg border border-gray-100 bg-gray-50 p-2 text-left text-xs hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <div className="truncate font-medium text-gray-800 dark:text-gray-200">{t.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <PriorityBadge priority={t.priority} />
                    {t.project_id && (
                      <span className="truncate text-xs text-gray-400">
                        {projects.find(p => p.id === t.project_id)?.title}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Month view (7×6 grid) ──────────────────────── */
function MonthView({ anchor, tasksByDate, onTaskOpen }: {
  anchor: Date
  tasksByDate: Map<string, Task[]>
  onTaskOpen: (task: Task) => void
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
    const end   = endOfWeek(endOfMonth(anchor),     { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [anchor])
  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <>
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {weekdays.map(d => (
          <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-gray-400">{d}</div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 auto-rows-fr">
        {days.map(day => (
          <DayCell key={day.toISOString()} day={day} anchor={anchor} tasksByDate={tasksByDate} onTaskOpen={onTaskOpen} compact />
        ))}
      </div>
    </>
  )
}

/* ── Week view (7 columns, taller) ──────────────── */
function WeekView({ anchor, tasksByDate, onTaskOpen }: {
  anchor: Date
  tasksByDate: Map<string, Task[]>
  onTaskOpen: (task: Task) => void
}) {
  const days = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 1 })
    const end   = endOfWeek(anchor,   { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [anchor])

  return (
    <div className="grid flex-1 grid-cols-7 divide-x divide-gray-100 overflow-y-auto dark:divide-gray-800">
      {days.map(day => (
        <div key={day.toISOString()} className="flex min-h-0 flex-col">
          <div className={`border-b border-gray-100 px-2 py-1.5 text-center dark:border-gray-800 ${
            isToday(day) ? 'bg-blue-50 dark:bg-blue-950/30' : ''
          }`}>
            <div className="text-xs text-gray-400">{format(day, 'EEE', { locale: ru })}</div>
            <div className={`text-sm font-semibold ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {format(day, 'd')}
            </div>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-1">
            {(tasksByDate.get(format(day, 'yyyy-MM-dd')) ?? []).map(t => (
              <button
                key={t.id}
                onClick={() => onTaskOpen(t)}
                className={`block w-full truncate rounded px-1.5 py-1 text-left text-xs ${
                  t.status === 'done'
                    ? 'bg-gray-100 text-gray-400 line-through dark:bg-gray-800'
                    : t.priority === 'high'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300'
                }`}
                title={t.title}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Today view (agenda) ────────────────────────── */
function TodayView({ anchor, tasksByDate, tasks, onTaskOpen }: {
  anchor: Date
  tasksByDate: Map<string, Task[]>
  tasks: Task[]
  onTaskOpen: (task: Task) => void
}) {
  const dayKey = format(anchor, 'yyyy-MM-dd')
  const todayTasks = tasksByDate.get(dayKey) ?? []
  const overdue = useMemo(
    () => tasks.filter(t =>
      t.due_date &&
      t.status !== 'done' &&
      isPast(new Date(t.due_date)) &&
      t.due_date !== dayKey
    ).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')),
    [tasks, dayKey]
  )

  return (
    <div className="overflow-y-auto p-4">
      <Section title={`Сегодня (${todayTasks.length})`}>
        {todayTasks.length === 0
          ? <p className="text-sm text-gray-400">Задач на сегодня нет</p>
          : todayTasks.map(t => <AgendaItem key={t.id} task={t} onOpen={onTaskOpen} />)}
      </Section>

      {overdue.length > 0 && isToday(anchor) && (
        <Section title={`Просроченные (${overdue.length})`} muted>
          {overdue.map(t => <AgendaItem key={t.id} task={t} onOpen={onTaskOpen} overdue />)}
        </Section>
      )}
    </div>
  )
}

function Section({ title, muted, children }: { title: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${
        muted ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
      }`}>
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function AgendaItem({ task, onOpen, overdue }: { task: Task; onOpen: (t: Task) => void; overdue?: boolean }) {
  return (
    <button
      onClick={() => onOpen(task)}
      className={`block w-full rounded-lg border p-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
        overdue
          ? 'border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20'
          : 'border-gray-200 dark:border-gray-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={task.status === 'done' ? 'text-green-500' : 'text-gray-300'}>
          {task.status === 'done' ? '✓' : '○'}
        </span>
        <span className={`flex-1 font-medium ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
          {task.title}
        </span>
        <PriorityBadge priority={task.priority} />
      </div>
      {overdue && task.due_date && (
        <p className="mt-1 pl-7 text-xs text-red-500">⚠ Дедлайн был: {task.due_date}</p>
      )}
    </button>
  )
}

/* ── Reusable single day cell (used by Month) ───── */
function DayCell({ day, anchor, tasksByDate, onTaskOpen, compact }: {
  day: Date
  anchor: Date
  tasksByDate: Map<string, Task[]>
  onTaskOpen: (task: Task) => void
  compact?: boolean
}) {
  const key = format(day, 'yyyy-MM-dd')
  const dayTasks = tasksByDate.get(key) ?? []
  const otherMonth = !isSameMonth(day, anchor)
  const today = isToday(day)
  const maxVisible = compact ? 3 : 5

  return (
    <div className={`min-h-[80px] border-b border-r border-gray-100 p-1 dark:border-gray-800 ${
      otherMonth ? 'bg-gray-50/50 dark:bg-gray-950/30' : ''
    }`}>
      <div className={`mb-1 flex h-5 w-5 items-center justify-center text-xs ${
        today
          ? 'rounded-full bg-blue-600 font-semibold text-white'
          : otherMonth
            ? 'text-gray-300 dark:text-gray-700'
            : 'text-gray-500 dark:text-gray-400'
      }`}>
        {format(day, 'd')}
      </div>
      <div className="space-y-0.5">
        {dayTasks.slice(0, maxVisible).map(t => (
          <button
            key={t.id}
            onClick={() => onTaskOpen(t)}
            className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-xs ${
              t.status === 'done'
                ? 'bg-gray-100 text-gray-400 line-through dark:bg-gray-800'
                : t.priority === 'high'
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300'
            }`}
            title={t.title}
          >
            {t.title}
          </button>
        ))}
        {dayTasks.length > maxVisible && (
          <div className="px-1 text-xs text-gray-400">+{dayTasks.length - maxVisible}</div>
        )}
      </div>
    </div>
  )
}
