'use client'

import { useMemo, useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth,
  startOfWeek, endOfWeek, addMonths, subMonths, isToday,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import type { Task, Project } from '@/lib/types'

interface CalendarViewProps {
  tasks: Task[]
  projects: Project[]
  onTaskOpen: (task: Task) => void
}

export function CalendarView({ tasks, projects, onTaskOpen }: CalendarViewProps) {
  const [month, setMonth] = useState(new Date())

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  // Group tasks by due date
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

  const undatedTasks = useMemo(
    () => tasks.filter(t => !t.due_date),
    [tasks]
  )

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div className="flex h-full flex-col gap-3 lg:flex-row">
      {/* Main calendar */}
      <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            ←
          </button>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            {format(month, 'LLLL yyyy', { locale: ru })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth(new Date())}
              className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Сегодня
            </button>
            <button
              onClick={() => setMonth(addMonths(month, 1))}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
            >
              →
            </button>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
          {weekdays.map(d => (
            <div key={d} className="px-2 py-1.5 text-center text-xs font-medium text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid flex-1 grid-cols-7 auto-rows-fr">
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDate.get(key) ?? []
            const otherMonth = !isSameMonth(day, month)
            const today = isToday(day)

            return (
              <div
                key={key}
                className={`min-h-[80px] border-b border-r border-gray-100 p-1 dark:border-gray-800 ${
                  otherMonth ? 'bg-gray-50/50 dark:bg-gray-950/30' : ''
                }`}
              >
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
                  {dayTasks.slice(0, 3).map(t => (
                    <button
                      key={t.id}
                      onClick={() => onTaskOpen(t)}
                      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-xs transition-colors ${
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
                  {dayTasks.length > 3 && (
                    <div className="px-1 text-xs text-gray-400">+{dayTasks.length - 3}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
  )
}
