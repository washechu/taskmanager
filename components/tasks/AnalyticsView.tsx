'use client'

import { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachWeekOfInterval,
  eachDayOfInterval, eachMonthOfInterval, format, parseISO, differenceInDays,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  STATUSES, ASSIGNEES, type Task, type Project, type Status,
} from '@/lib/types'
import { useTags } from '@/lib/hooks/useTags'
import { TagChip } from '@/components/ui/TagChip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

type Period = 'week' | 'month' | 'custom'

const PERIOD_OPTIONS = [
  { value: 'week'   as const, label: 'Неделя' },
  { value: 'month'  as const, label: 'Месяц'  },
  { value: 'custom' as const, label: 'Период' },
]

const STATUS_HEX: Record<Status, string> = {
  todo:        '#9ca3af',
  in_progress: '#eab308',
  done:        '#22c55e',
  paused:      '#f97316',
}

const ASSIGNEE_HEX: Record<string, string> = {
  nick:  '#6366f1', // indigo-500
  galya: '#ec4899', // pink-500
  none:  '#9ca3af', // gray-400
}

interface AnalyticsViewProps {
  tasks: Task[]
  /** Reserved for future project-aware widgets. */
  projects?: Project[]
  onTaskOpen: (task: Task) => void
}

export function AnalyticsView({ tasks, onTaskOpen }: AnalyticsViewProps) {
  const [period, setPeriod] = useState<Period>('week')
  // ISO yyyy-MM-dd strings for the custom range pickers
  const todayIso = format(new Date(), 'yyyy-MM-dd')
  const monthAgoIso = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const [customFrom, setCustomFrom] = useState<string>(monthAgoIso)
  const [customTo,   setCustomTo]   = useState<string>(todayIso)

  /* ── Compute period bounds ────────────────────────────── */
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date()
    switch (period) {
      case 'week':    return { rangeStart: startOfWeek(now, { weekStartsOn: 1 }), rangeEnd: endOfWeek(now, { weekStartsOn: 1 }) }
      case 'month':   return { rangeStart: startOfMonth(now),   rangeEnd: endOfMonth(now)   }
      case 'custom': {
        // Validate / fall back to safe range
        const from = customFrom ? startOfDay(parseISO(customFrom)) : new Date(0)
        const to   = customTo   ? endOfDay(parseISO(customTo))     : now
        return from > to
          ? { rangeStart: to, rangeEnd: from }
          : { rangeStart: from, rangeEnd: to }
      }
      default:        return { rangeStart: new Date(0),         rangeEnd: now               }
    }
  }, [period, customFrom, customTo])

  /* ── Filter tasks by period (created in period) ───────── */
  const tasksInPeriod = useMemo(() =>
    tasks.filter(t => {
      const created = parseISO(t.created_at)
      return created >= rangeStart && created <= rangeEnd
    }),
    [tasks, rangeStart, rangeEnd]
  )

  /* ── KPIs ─────────────────────────────────────────────── */
  const createdCount = tasksInPeriod.length
  const closedInPeriod = useMemo(() =>
    tasks.filter(t => {
      if (t.status !== 'done') return false
      const updated = parseISO(t.updated_at)
      return updated >= rangeStart && updated <= rangeEnd
    }).length,
    [tasks, rangeStart, rangeEnd]
  )
  const activeNow = useMemo(() =>
    tasks.filter(t => t.status === 'in_progress').length,
    [tasks]
  )
  const overdueNow = useMemo(() => {
    // Сегодняшние не считаем просроченными — день ещё не закончился.
    const today = startOfDay(new Date())
    return tasks.filter(t =>
      t.due_date &&
      t.status !== 'done' &&
      parseISO(t.due_date) < today
    )
  }, [tasks])

  /* ── Donut: status distribution (within period) ───────── */
  const statusData = useMemo(() => {
    const counts: Record<Status, number> = { todo: 0, in_progress: 0, done: 0, paused: 0 }
    for (const t of tasksInPeriod) counts[t.status]++
    return (Object.keys(counts) as Status[])
      .map(s => ({ name: STATUSES[s].label, value: counts[s], status: s }))
      .filter(d => d.value > 0)
  }, [tasksInPeriod])

  /* ── Donut: assignee distribution (within period) ─────── */
  // Задачи с несколькими ответственными считаются у каждого. Сумма
  // секторов может превышать число задач в выборке.
  const assigneeData = useMemo(() => {
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

  /* ── Stacked bar: tasks created per bucket, by status ──── */
  const { barData, bucketLabel } = useMemo(() => {
    // Pick bucket size based on period span
    const days = differenceInDays(rangeEnd, rangeStart)
    let buckets: Date[]
    let labelFmt: string
    let bucketLabel: string
    if (days <= 14) {
      buckets = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
      labelFmt = 'd MMM'
      bucketLabel = 'день'
    } else if (days <= 100) {
      buckets = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 })
      labelFmt = 'd MMM'
      bucketLabel = 'неделя'
    } else {
      buckets = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })
      labelFmt = 'LLL yyyy'
      bucketLabel = 'месяц'
    }

    const data = buckets.map((bucketStart, idx) => {
      const next = buckets[idx + 1] ?? rangeEnd
      const bucketEnd = next > rangeEnd ? rangeEnd : next
      const counts: Record<Status, number> = { todo: 0, in_progress: 0, done: 0, paused: 0 }
      for (const t of tasks) {
        const created = parseISO(t.created_at)
        if (created >= bucketStart && created < bucketEnd) counts[t.status]++
      }
      return {
        label: format(bucketStart, labelFmt, { locale: ru }),
        ...counts,
      }
    })

    return { barData: data, bucketLabel }
  }, [tasks, period, rangeStart, rangeEnd])

  /* ── Top tags ─────────────────────────────────────────── */
  const { tags: allTags } = useTags()
  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tasksInPeriod) {
      for (const tag of t.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))
  }, [tasksInPeriod])

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Период</span>
        <SegmentedControl
          variant="view"
          value={period}
          onChange={setPeriod}
          ariaLabel="Период аналитики"
          options={PERIOD_OPTIONS}
        />

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">с</span>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            />
            <span className="text-[11px] uppercase tracking-wide text-gray-400">по</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            />
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Создано за период" value={createdCount} />
        <KpiCard label="Закрыто за период" value={closedInPeriod} accent="green" />
        <KpiCard label="В процессе сейчас" value={activeNow} accent="yellow" />
        <KpiCard label="Просрочено сейчас" value={overdueNow.length} accent={overdueNow.length > 0 ? 'red' : undefined} />
      </div>

      {/* Donuts row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="По статусам">
          {statusData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {statusData.map(d => (
                    <Cell key={d.status} fill={STATUS_HEX[d.status]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  formatter={(v) => `${v} задач`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="По участникам">
          {assigneeData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={assigneeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {assigneeData.map(d => (
                    <Cell key={d.key} fill={ASSIGNEE_HEX[d.key]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  formatter={(v) => `${v} задач`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Stacked bar chart */}
      <Card title={`Создано задач (по ${bucketLabel}м)`}>
          {barData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb33" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
                <Bar dataKey="todo"        stackId="a" fill={STATUS_HEX.todo}        name={STATUSES.todo.label}        radius={[0, 0, 0, 0]} />
                <Bar dataKey="in_progress" stackId="a" fill={STATUS_HEX.in_progress} name={STATUSES.in_progress.label} />
                <Bar dataKey="paused"      stackId="a" fill={STATUS_HEX.paused}      name={STATUSES.paused.label}      />
                <Bar dataKey="done"        stackId="a" fill={STATUS_HEX.done}        name={STATUSES.done.label}        radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

      {/* Lists row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title={`Просроченные сейчас (${overdueNow.length})`}>
          {overdueNow.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Нет просроченных задач</p>
          ) : (
            <ul className="space-y-1">
              {overdueNow.slice(0, 8).map(t => (
                <li key={t.id}>
                  <button
                    onClick={() => onTaskOpen(t)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-red-50 dark:text-gray-300 dark:hover:bg-red-950/30"
                  >
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-red-500">⚠ {t.due_date}</span>
                  </button>
                </li>
              ))}
              {overdueNow.length > 8 && (
                <li className="px-2 text-xs text-gray-400">…ещё {overdueNow.length - 8}</li>
              )}
            </ul>
          )}
        </Card>

        <Card title="Топ тегов">
          {topTags.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Теги не использовались</p>
          ) : (
            <ul className="space-y-2">
              {topTags.map(({ name, count }) => {
                const max = topTags[0].count
                return (
                  <li key={name} className="flex items-center gap-3">
                    <div className="w-28 flex-shrink-0">
                      <TagChip name={name} tags={allTags} />
                    </div>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs font-medium text-gray-400 dark:text-gray-500">{count}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────── */

function KpiCard({ label, value, accent }: {
  label: string
  value: number
  accent?: 'green' | 'blue' | 'yellow' | 'red'
}) {
  const accentClass =
    accent === 'green'  ? 'text-green-600 dark:text-green-400'   :
    accent === 'blue'   ? 'text-blue-600 dark:text-blue-400'     :
    accent === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
    accent === 'red'    ? 'text-red-600 dark:text-red-400'       :
                          'text-gray-900 dark:text-white'
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accentClass}`}>{value}</p>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
      Нет данных за период
    </div>
  )
}
