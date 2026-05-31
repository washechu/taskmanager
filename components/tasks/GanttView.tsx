'use client'

import { useMemo } from 'react'
import {
  differenceInDays, eachDayOfInterval, format, max, min, parseISO,
  startOfDay, addDays, isWeekend, isToday,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { STATUSES, type Task, type Project, type Status } from '@/lib/types'

interface GanttViewProps {
  tasks: Task[]
  projects: Project[]
  onTaskOpen: (task: Task) => void
}

const DAY_WIDTH = 32 // px per day

const STATUS_COLORS: Record<Status, string> = {
  todo:        'bg-gray-400',
  in_progress: 'bg-blue-500',
  done:        'bg-green-500',
  paused:      'bg-orange-500',
}

interface Range {
  start: Date
  end: Date
  task: Task
  isPoint: boolean
}

export function GanttView({ tasks, projects, onTaskOpen }: GanttViewProps) {
  // Tasks with at least one date go on timeline; rest go to sidebar
  const datedTasks = useMemo<Range[]>(() => {
    const out: Range[] = []
    for (const task of tasks) {
      if (!task.start_date && !task.due_date) continue
      const start = task.start_date ? startOfDay(parseISO(task.start_date)) : null
      const end   = task.due_date   ? startOfDay(parseISO(task.due_date))   : null
      if (start && !end) out.push({ start, end: start, task, isPoint: true })
      else if (!start && end) out.push({ start: end, end, task, isPoint: true })
      else if (start && end) out.push({ start, end, task, isPoint: false })
    }
    return out
  }, [tasks])

  const undated = useMemo(
    () => tasks.filter(t => !t.start_date && !t.due_date),
    [tasks]
  )

  const { rangeStart, days } = useMemo(() => {
    if (datedTasks.length === 0) {
      const today = startOfDay(new Date())
      const start = addDays(today, -7)
      const end   = addDays(today, 30)
      return { rangeStart: start, days: eachDayOfInterval({ start, end }) }
    }
    const allStarts = datedTasks.map(r => r.start)
    const allEnds   = datedTasks.map(r => r.end)
    const rs = addDays(min(allStarts), -3)
    const re = addDays(max(allEnds), 7)
    return { rangeStart: rs, days: eachDayOfInterval({ start: rs, end: re }) }
  }, [datedTasks])

  // Group dated tasks by project
  const groups = useMemo(() => {
    const map = new Map<string | null, Range[]>()
    for (const r of datedTasks) {
      const key = r.task.project_id
      const arr = map.get(key) ?? []
      arr.push(r)
      map.set(key, arr)
    }
    return Array.from(map.entries()).map(([projectId, rows]) => ({
      projectId,
      project: projects.find(p => p.id === projectId) ?? null,
      rows,
    }))
  }, [datedTasks, projects])

  const totalWidth = days.length * DAY_WIDTH

  if (datedTasks.length === 0 && undated.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
        Задач нет
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 lg:flex-row">
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {datedTasks.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-400">
            Добавьте даты к задачам чтобы увидеть их здесь
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div style={{ width: totalWidth + 240 }}>
              {/* Date header */}
              <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="sticky left-0 z-20 w-60 border-r border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-900">
                  Задача
                </div>
                <div className="flex">
                  {days.map((day, i) => {
                    const isFirstOfMonth = day.getDate() === 1 || i === 0
                    return (
                      <div
                        key={day.toISOString()}
                        className={`relative flex flex-col items-center border-r text-xs ${
                          isWeekend(day) ? 'bg-gray-50 dark:bg-gray-800/30' : ''
                        } ${isToday(day) ? 'bg-blue-50 dark:bg-blue-950/30' : ''} dark:border-gray-800`}
                        style={{ width: DAY_WIDTH }}
                      >
                        {isFirstOfMonth && (
                          <div className="absolute -top-0 left-0 whitespace-nowrap px-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {format(day, 'LLL yyyy', { locale: ru })}
                          </div>
                        )}
                        <div className="pt-4 text-gray-400">{format(day, 'EEEEE', { locale: ru })}</div>
                        <div className={isToday(day) ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-500'}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Rows grouped by project */}
              {groups.map(group => (
                <div key={group.projectId ?? 'none'}>
                  {/* Group header */}
                  <div className="flex border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                    <div className="sticky left-0 w-60 border-r border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:text-gray-300">
                      📁 {group.project?.title ?? 'Без проекта'}
                    </div>
                    <div style={{ width: totalWidth }} />
                  </div>
                  {/* Task rows */}
                  {group.rows.map(({ start, end, task, isPoint }) => {
                    const offsetDays = differenceInDays(start, rangeStart)
                    const spanDays   = isPoint ? 1 : differenceInDays(end, start) + 1
                    const left  = offsetDays * DAY_WIDTH
                    const width = spanDays   * DAY_WIDTH
                    return (
                      <div key={task.id} className="flex border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40">
                        <button
                          onClick={() => onTaskOpen(task)}
                          className="sticky left-0 flex w-60 items-center gap-2 truncate border-r border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 hover:text-blue-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-blue-400"
                        >
                          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${STATUS_COLORS[task.status]}`} />
                          <span className="truncate">{task.title}</span>
                        </button>
                        <div className="relative" style={{ width: totalWidth, height: 36 }}>
                          <button
                            onClick={() => onTaskOpen(task)}
                            className={`absolute top-1.5 h-7 rounded-md ${STATUS_COLORS[task.status]} ${
                              isPoint ? 'rounded-full' : ''
                            } opacity-80 hover:opacity-100`}
                            style={{ left, width: isPoint ? DAY_WIDTH * 0.5 : width, marginLeft: isPoint ? DAY_WIDTH * 0.25 : 0 }}
                            title={`${task.title} — ${STATUSES[task.status].label}`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Undated tasks sidebar */}
      {undated.length > 0 && (
        <div className="flex max-h-64 w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:max-h-none lg:w-64">
          <div className="border-b border-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
            Без дат ({undated.length})
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {undated.map(t => (
              <button
                key={t.id}
                onClick={() => onTaskOpen(t)}
                className="block w-full truncate rounded-lg border border-gray-100 bg-gray-50 p-2 text-left text-xs hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${STATUS_COLORS[t.status]}`} />
                <span className="text-gray-700 dark:text-gray-300">{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
