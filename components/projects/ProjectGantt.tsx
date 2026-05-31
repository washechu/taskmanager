'use client'

import { useMemo } from 'react'
import {
  differenceInDays, eachDayOfInterval, format, max, min, parseISO,
  startOfDay, addDays, isWeekend, isToday,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { type Project, type Status } from '@/lib/types'

interface ProjectGanttProps {
  projects: Project[]
  onProjectOpen: (project: Project) => void
}

const DAY_WIDTH = 32

const STATUS_COLORS: Record<Status, string> = {
  todo:        'bg-gray-400',
  in_progress: 'bg-blue-500',
  done:        'bg-green-500',
  paused:      'bg-orange-500',
}

interface Range {
  start: Date
  end: Date
  project: Project
  isPoint: boolean
}

export function ProjectGantt({ projects, onProjectOpen }: ProjectGanttProps) {
  const dated = useMemo<Range[]>(() => {
    const out: Range[] = []
    for (const p of projects) {
      if (!p.start_date && !p.due_date) continue
      const start = p.start_date ? startOfDay(parseISO(p.start_date)) : null
      const end   = p.due_date   ? startOfDay(parseISO(p.due_date))   : null
      if (start && !end) out.push({ start, end: start, project: p, isPoint: true })
      else if (!start && end) out.push({ start: end, end, project: p, isPoint: true })
      else if (start && end) out.push({ start, end, project: p, isPoint: false })
    }
    return out
  }, [projects])

  const undated = useMemo(
    () => projects.filter(p => !p.start_date && !p.due_date),
    [projects]
  )

  const { rangeStart, days } = useMemo(() => {
    if (dated.length === 0) {
      const today = startOfDay(new Date())
      const start = addDays(today, -7)
      const end   = addDays(today, 30)
      return { rangeStart: start, days: eachDayOfInterval({ start, end }) }
    }
    const rs = addDays(min(dated.map(r => r.start)), -3)
    const re = addDays(max(dated.map(r => r.end)),    7)
    return { rangeStart: rs, days: eachDayOfInterval({ start: rs, end: re }) }
  }, [dated])

  const totalWidth = days.length * DAY_WIDTH

  if (dated.length === 0 && undated.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
        Проектов нет
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 lg:flex-row">
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {dated.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-400">
            Добавьте даты к проектам чтобы увидеть их здесь
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div style={{ width: totalWidth + 240 }}>
              <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="sticky left-0 z-20 w-60 border-r border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-900">
                  Проект
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
                          <div className="absolute top-0 left-0 whitespace-nowrap px-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
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

              {dated.map(({ start, end, project, isPoint }) => {
                const offsetDays = differenceInDays(start, rangeStart)
                const spanDays   = isPoint ? 1 : differenceInDays(end, start) + 1
                const left  = offsetDays * DAY_WIDTH
                const width = spanDays   * DAY_WIDTH
                return (
                  <div key={project.id} className="flex border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40">
                    <button
                      onClick={() => onProjectOpen(project)}
                      className="sticky left-0 flex w-60 items-center gap-2 truncate border-r border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 hover:text-blue-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-blue-400"
                    >
                      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${STATUS_COLORS[project.status]}`} />
                      <span className="truncate">{project.title}</span>
                    </button>
                    <div className="relative" style={{ width: totalWidth, height: 36 }}>
                      <button
                        onClick={() => onProjectOpen(project)}
                        className={`absolute top-1.5 h-7 rounded-md ${STATUS_COLORS[project.status]} ${
                          isPoint ? 'rounded-full' : ''
                        } opacity-80 hover:opacity-100`}
                        style={{ left, width: isPoint ? DAY_WIDTH * 0.5 : width, marginLeft: isPoint ? DAY_WIDTH * 0.25 : 0 }}
                        title={project.title}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {undated.length > 0 && (
        <div className="flex max-h-64 w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:max-h-none lg:w-64">
          <div className="border-b border-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
            Без дат ({undated.length})
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {undated.map(p => (
              <button
                key={p.id}
                onClick={() => onProjectOpen(p)}
                className="block w-full truncate rounded-lg border border-gray-100 bg-gray-50 p-2 text-left text-xs hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${STATUS_COLORS[p.status]}`} />
                <span className="text-gray-700 dark:text-gray-300">{p.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
