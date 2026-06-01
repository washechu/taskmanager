'use client'

import { useMemo, useState } from 'react'
import {
  differenceInDays, eachDayOfInterval, format, max, min, parseISO,
  startOfDay, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addMonths, subMonths, addWeeks, subWeeks, isWeekend, isToday,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { type Project, type Status, type Task } from '@/lib/types'

interface ProjectGanttProps {
  projects: Project[]
  tasks?: Task[]
  onProjectOpen: (project: Project) => void
  onTaskOpen?: (taskId: string) => void
}

type Slice = 'today' | 'week' | 'month'

const SLICES: { id: Slice; label: string }[] = [
  { id: 'today', label: 'Сегодня' },
  { id: 'week',  label: 'Неделя'  },
  { id: 'month', label: 'Месяц'   },
]

const STATUS_COLORS: Record<Status, string> = {
  todo:        'bg-gray-400',
  in_progress: 'bg-blue-500',
  done:        'bg-green-500',
  paused:      'bg-orange-500',
}

interface Range {
  start: Date
  end: Date
  isPoint: boolean
}

function rangeOf(start: string | null, end: string | null): Range | null {
  const s = start ? startOfDay(parseISO(start)) : null
  const e = end   ? startOfDay(parseISO(end))   : null
  if (s && !e) return { start: s, end: s, isPoint: true }
  if (!s && e) return { start: e, end: e, isPoint: true }
  if (s && e)  return { start: s, end: e, isPoint: false }
  return null
}

export function ProjectGantt({ projects, tasks = [], onProjectOpen, onTaskOpen }: ProjectGanttProps) {
  const [slice, setSlice] = useState<Slice>('month')
  const [anchor, setAnchor] = useState(new Date())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleCollapsed = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Build hierarchical groups: project + its dated tasks
  const groups = useMemo(() => {
    const out: {
      project: Project | null
      projectRange: Range | null
      taskRanges: { task: Task; range: Range }[]
    }[] = []

    for (const project of projects) {
      const projTasks = tasks.filter(t => t.project_id === project.id)
      const projectRange = rangeOf(project.start_date, project.due_date)
      const taskRanges = projTasks
        .map(t => ({ task: t, range: rangeOf(t.start_date, t.due_date) }))
        .filter((x): x is { task: Task; range: Range } => x.range !== null)
      // Skip projects with no dates anywhere (they go to sidebar)
      if (!projectRange && taskRanges.length === 0) continue
      out.push({ project, projectRange, taskRanges })
    }

    // Unaffiliated tasks (no project_id) — show them under "Без проекта"
    const orphans = tasks
      .filter(t => !t.project_id)
      .map(t => ({ task: t, range: rangeOf(t.start_date, t.due_date) }))
      .filter((x): x is { task: Task; range: Range } => x.range !== null)
    if (orphans.length > 0) {
      out.push({ project: null, projectRange: null, taskRanges: orphans })
    }

    return out
  }, [projects, tasks])

  // Projects with no dates anywhere — show in sidebar
  const undatedProjects = useMemo(() =>
    projects.filter(p => {
      if (p.start_date || p.due_date) return false
      const hasDatedTasks = tasks.some(t =>
        t.project_id === p.id && (t.start_date || t.due_date)
      )
      return !hasDatedTasks
    }),
    [projects, tasks]
  )

  // Tasks without dates — show in sidebar (mirrors Calendar behavior)
  const undatedTasks = useMemo(() =>
    tasks.filter(t => !t.start_date && !t.due_date),
    [tasks]
  )

  // Visible date range based on current slice
  const { rangeStart, rangeEnd, days, dayWidth } = useMemo(() => {
    let rs: Date, re: Date, dw: number
    if (slice === 'today') {
      rs = startOfDay(anchor)
      re = addDays(rs, 6)
      dw = 56
    } else if (slice === 'week') {
      rs = startOfWeek(anchor, { weekStartsOn: 1 })
      re = endOfWeek(anchor,   { weekStartsOn: 1 })
      dw = 80
    } else {
      rs = startOfMonth(anchor)
      re = endOfMonth(anchor)
      dw = 32
    }
    return { rangeStart: rs, rangeEnd: re, days: eachDayOfInterval({ start: rs, end: re }), dayWidth: dw }
  }, [slice, anchor])

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
    slice === 'today' ? `${format(anchor, 'd MMM', { locale: ru })} — ${format(addDays(anchor, 6), 'd MMM', { locale: ru })}` :
    slice === 'week'  ? `Неделя с ${format(startOfWeek(anchor, { weekStartsOn: 1 }), 'd MMM', { locale: ru })}` :
                        format(anchor, 'LLLL yyyy', { locale: ru })

  const totalWidth = days.length * dayWidth
  const LABEL_WIDTH = 220

  /** Render a bar within the visible range; clip if outside */
  const renderBar = (range: Range, colorClass: string, opacity = 'opacity-80') => {
    // Clamp to visible range
    const clipStart = max([range.start, rangeStart])
    const clipEnd   = min([range.end,   rangeEnd])
    if (clipStart > rangeEnd || clipEnd < rangeStart) return null

    const offsetDays = differenceInDays(clipStart, rangeStart)
    const spanDays   = range.isPoint ? 1 : differenceInDays(clipEnd, clipStart) + 1
    const left  = offsetDays * dayWidth
    const width = range.isPoint ? dayWidth * 0.5 : spanDays * dayWidth
    return (
      <div
        className={`absolute top-1.5 h-6 rounded-md ${colorClass} ${
          range.isPoint ? 'rounded-full' : ''
        } ${opacity} hover:opacity-100`}
        style={{ left: range.isPoint ? left + dayWidth * 0.25 : left, width }}
      />
    )
  }

  const hasContent = groups.length > 0 || undatedProjects.length > 0 || undatedTasks.length > 0
  const hasSidebar = undatedProjects.length > 0 || undatedTasks.length > 0

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
          {SLICES.map(s => (
            <button
              key={s.id}
              onClick={() => setSlice(s.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                slice === s.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={goPrev}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800">←</button>
          <h2 className="px-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={goNext}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800">→</button>
          <button onClick={goToday}
            className="ml-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
            Сегодня
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {!hasContent ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-400">
              Добавьте даты к проектам или их задачам чтобы увидеть таймлайн
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <div style={{ width: totalWidth + LABEL_WIDTH }}>
                {/* Date header */}
                <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                  <div className="sticky left-0 z-20 border-r border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-900"
                    style={{ width: LABEL_WIDTH }}>
                    Проект / Задача
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
                          style={{ width: dayWidth }}
                        >
                          {isFirstOfMonth && slice !== 'today' && (
                            <div className="absolute top-0 left-0 whitespace-nowrap px-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {format(day, 'LLL', { locale: ru })}
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

                {/* Groups */}
                {groups.map(({ project, taskRanges }) => {
                  const groupKey = project?.id ?? 'no-project'
                  const isCollapsed = collapsed.has(groupKey)
                  return (
                    <div key={groupKey}>
                      {/* Project row */}
                      <div className="flex border-b border-gray-100 bg-gray-50/40 hover:bg-gray-100/60 dark:border-gray-800 dark:bg-gray-800/30 dark:hover:bg-gray-800/60">
                        <div
                          className="sticky left-0 z-10 flex items-center gap-1 border-r border-gray-200 bg-gray-50/40 px-2 py-2 text-xs font-semibold text-gray-700 dark:border-gray-800 dark:bg-gray-800/30 dark:text-gray-300"
                          style={{ width: LABEL_WIDTH }}
                        >
                          {taskRanges.length > 0 ? (
                            <button
                              onClick={() => toggleCollapsed(groupKey)}
                              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              title={isCollapsed ? 'Развернуть' : 'Свернуть'}
                            >
                              {isCollapsed ? '▶' : '▼'}
                            </button>
                          ) : (
                            <span className="w-5 flex-shrink-0" />
                          )}
                          <button
                            onClick={() => project && onProjectOpen(project)}
                            disabled={!project}
                            className="flex flex-1 items-center gap-1.5 truncate text-left hover:text-blue-600 dark:hover:text-blue-400 disabled:hover:text-gray-700"
                          >
                            <span>📁</span>
                            <span className="truncate">{project?.title ?? 'Без проекта'}</span>
                            {taskRanges.length > 0 && (
                              <span className="text-[10px] font-normal text-gray-400">({taskRanges.length})</span>
                            )}
                          </button>
                        </div>
                        <div className="relative" style={{ width: totalWidth, height: 36 }} />
                        {/* Project bar intentionally not rendered — only task bars per spec */}
                      </div>
                      {/* Task sub-rows — hidden when collapsed */}
                      {!isCollapsed && taskRanges.map(({ task, range }) => (
                        <div key={task.id} className="flex border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40">
                          <button
                            onClick={() => onTaskOpen?.(task.id)}
                            disabled={!onTaskOpen}
                            className="sticky left-0 flex items-center gap-2 truncate border-r border-gray-200 bg-white px-3 py-2 pl-10 text-left text-xs text-gray-600 hover:text-blue-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:text-blue-400 disabled:hover:text-gray-600"
                            style={{ width: LABEL_WIDTH }}
                          >
                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${STATUS_COLORS[task.status]}`} />
                            <span className="truncate">{task.title}</span>
                          </button>
                          <div className="relative" style={{ width: totalWidth, height: 32 }}>
                            {renderBar(range, STATUS_COLORS[task.status], 'opacity-70')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — undated projects & tasks */}
        {hasSidebar && (
          <div className="flex max-h-96 w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:max-h-none lg:w-64">
            <div className="border-b border-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
              Без дат ({undatedProjects.length + undatedTasks.length})
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-2">
              {undatedProjects.length > 0 && (
                <div>
                  <p className="mb-1 px-1 text-[11px] uppercase tracking-wide text-gray-400">
                    Проекты ({undatedProjects.length})
                  </p>
                  <div className="space-y-1.5">
                    {undatedProjects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => onProjectOpen(p)}
                        className="block w-full truncate rounded-lg border border-gray-100 bg-gray-50 p-2 text-left text-xs hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${STATUS_COLORS[p.status]}`} />
                        <span className="text-gray-700 dark:text-gray-300">📁 {p.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {undatedTasks.length > 0 && (
                <div>
                  <p className="mb-1 px-1 text-[11px] uppercase tracking-wide text-gray-400">
                    Задачи ({undatedTasks.length})
                  </p>
                  <div className="space-y-1.5">
                    {undatedTasks.map(t => {
                      const proj = projects.find(p => p.id === t.project_id)
                      return (
                        <button
                          key={t.id}
                          onClick={() => onTaskOpen?.(t.id)}
                          disabled={!onTaskOpen}
                          className="block w-full rounded-lg border border-gray-100 bg-gray-50 p-2 text-left text-xs hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${STATUS_COLORS[t.status]}`} />
                            <span className="truncate text-gray-700 dark:text-gray-300">{t.title}</span>
                          </div>
                          {proj && (
                            <div className="mt-0.5 truncate pl-3.5 text-[10px] text-gray-400">
                              {proj.title}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
