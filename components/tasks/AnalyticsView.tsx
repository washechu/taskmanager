'use client'

import { useMemo, useState } from 'react'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachWeekOfInterval, eachDayOfInterval, eachMonthOfInterval, format,
  parseISO, differenceInDays,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { STATUSES, ASSIGNEES, type Task, type Project, type Status } from '@/lib/types'
import { useTags } from '@/lib/hooks/useTags'
import { AnalyticsHeader, type Period } from './analytics/AnalyticsHeader'
import { KpiRow } from './analytics/KpiRow'
import { StatusDonut, AssigneeDonut, CreatedBar } from './analytics/Charts'
import { TopTagsSection } from './analytics/TopTagsSection'
import { TtmSection } from './analytics/TtmSection'
import { DrillDownModal } from './analytics/DrillDownModal'

interface AnalyticsViewProps {
  tasks: Task[]
  /** Reserved for future project-aware widgets. */
  projects?: Project[]
  onTaskOpen: (task: Task) => void
}

/**
 * Аналитика задач: оркестратор. Считает агрегаты, держит состояние периода
 * и drill-down модалки. Виджеты вынесены в `./analytics/*`.
 */
export function AnalyticsView({ tasks, onTaskOpen }: AnalyticsViewProps) {
  const [period, setPeriod] = useState<Period>('week')
  const todayIso = format(new Date(), 'yyyy-MM-dd')
  const monthAgoIso = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const [customFrom, setCustomFrom] = useState<string>(monthAgoIso)
  const [customTo,   setCustomTo]   = useState<string>(todayIso)
  // KPI drill-down: клик по KPI → модалка со списком задач за этим числом
  const [drillDown, setDrillDown] = useState<{ title: string; tasks: Task[] } | null>(null)

  /* ── Period bounds ────────────────────────────────────── */
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date()
    switch (period) {
      case 'week':  return { rangeStart: startOfWeek(now, { weekStartsOn: 1 }), rangeEnd: endOfWeek(now, { weekStartsOn: 1 }) }
      case 'month': return { rangeStart: startOfMonth(now), rangeEnd: endOfMonth(now) }
      case 'custom': {
        const from = customFrom ? startOfDay(parseISO(customFrom)) : new Date(0)
        const to   = customTo   ? endOfDay(parseISO(customTo))     : now
        return from > to
          ? { rangeStart: to, rangeEnd: from }
          : { rangeStart: from, rangeEnd: to }
      }
      default: return { rangeStart: new Date(0), rangeEnd: now }
    }
  }, [period, customFrom, customTo])

  // Отменённые исключаем из всей аналитики целиком: не «закрыто», не часть
  // «создано», не появляется в донатах. Отдельного KPI «Отменено» нет.
  const analyticsTasks = useMemo(
    () => tasks.filter(t => t.status !== 'cancelled'),
    [tasks],
  )

  /* ── Slices for KPI + drill-down ──────────────────────── */
  const tasksInPeriod = useMemo(() =>
    analyticsTasks.filter(t => {
      const created = parseISO(t.created_at)
      return created >= rangeStart && created <= rangeEnd
    }),
    [analyticsTasks, rangeStart, rangeEnd]
  )

  const closedInPeriod = useMemo(() =>
    analyticsTasks.filter(t => {
      if (t.status !== 'done') return false
      // Предпочитаем completed_at (м.026), fallback на updated_at для старых.
      const closedAt = t.completed_at ? parseISO(t.completed_at) : parseISO(t.updated_at)
      return closedAt >= rangeStart && closedAt <= rangeEnd
    }),
    [analyticsTasks, rangeStart, rangeEnd]
  )

  const activeNow = useMemo(
    () => analyticsTasks.filter(t => t.status === 'in_progress'),
    [analyticsTasks],
  )

  const overdueNow = useMemo(() => {
    const today = startOfDay(new Date())
    // paused и cancelled — НЕ просрочены (м.028/м.029). Симметрично с dueStatus().
    return analyticsTasks.filter(t =>
      t.due_date
      && t.status !== 'done' && t.status !== 'paused'
      && parseISO(t.due_date) < today
    )
  }, [analyticsTasks])

  /* ── Donut data: by status / by assignee (within period) ─ */
  const statusData = useMemo(() => {
    const counts: Record<Status, number> = {
      todo: 0, in_progress: 0, done: 0, paused: 0, cancelled: 0,
    }
    for (const t of tasksInPeriod) counts[t.status]++
    return (Object.keys(counts) as Status[])
      .map(s => ({ name: STATUSES[s].label, value: counts[s], status: s }))
      .filter(d => d.value > 0)
  }, [tasksInPeriod])

  const assigneeData = useMemo(() => {
    // Задачи с двумя ассайни считаются у каждого — сумма может превышать |tasks|.
    const counts: Record<string, number> = { nick: 0, galya: 0, none: 0 }
    for (const t of tasksInPeriod) {
      if (t.assignees.length === 0) counts.none++
      else for (const a of t.assignees) counts[a]++
    }
    return [
      { name: ASSIGNEES.nick.label,  value: counts.nick,  key: 'nick'  },
      { name: ASSIGNEES.galya.label, value: counts.galya, key: 'galya' },
      { name: 'Не назначен',         value: counts.none,  key: 'none'  },
    ].filter(d => d.value > 0)
  }, [tasksInPeriod])

  /* ── Stacked bar: tasks created per bucket ──────────────── */
  const barData = useMemo(() => {
    const days = differenceInDays(rangeEnd, rangeStart)
    let buckets: Date[]
    let labelFmt: string
    if (days <= 14) {
      buckets = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
      labelFmt = 'd MMM'
    } else if (days <= 100) {
      buckets = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 })
      labelFmt = 'd MMM'
    } else {
      buckets = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })
      labelFmt = 'LLL yyyy'
    }
    return buckets.map((bucketStart, idx) => {
      const next = buckets[idx + 1] ?? rangeEnd
      const bucketEnd = next > rangeEnd ? rangeEnd : next
      const counts: Record<Status, number> = {
        todo: 0, in_progress: 0, done: 0, paused: 0, cancelled: 0,
      }
      for (const t of analyticsTasks) {
        const created = parseISO(t.created_at)
        if (created >= bucketStart && created < bucketEnd) counts[t.status]++
      }
      return { label: format(bucketStart, labelFmt, { locale: ru }), ...counts }
    })
  }, [analyticsTasks, rangeStart, rangeEnd])

  /* ── Top tags ─────────────────────────────────────────── */
  const { tags: allTags } = useTags()
  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tasksInPeriod) for (const tag of t.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))
  }, [tasksInPeriod])

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4">
      <AnalyticsHeader
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      <KpiRow
        slices={{ created: tasksInPeriod, closed: closedInPeriod, active: activeNow, overdue: overdueNow }}
        onDrill={(title, tasks) => setDrillDown({ title, tasks })}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <StatusDonut data={statusData} />
        <AssigneeDonut data={assigneeData} />
      </div>

      <CreatedBar data={barData} />

      <TopTagsSection topTags={topTags} allTags={allTags} />

      <TtmSection tasks={analyticsTasks} rangeStart={rangeStart} rangeEnd={rangeEnd} />

      {drillDown && (
        <DrillDownModal
          title={drillDown.title}
          tasks={drillDown.tasks}
          onTaskOpen={(t) => { setDrillDown(null); onTaskOpen(t) }}
          onClose={() => setDrillDown(null)}
        />
      )}
    </div>
  )
}
