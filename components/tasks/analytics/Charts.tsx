'use client'

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Card, EmptyChart } from '@/components/ui/Card'
import { Section } from '@/components/ui/Section'
import { STATUSES, type Status } from '@/lib/types'

export const STATUS_HEX: Record<Status, string> = {
  todo:        '#9ca3af',
  in_progress: '#eab308',
  done:        '#22c55e',
  paused:      '#f97316',
  // slate-400 — для cancelled. В аналитике cancelled-задачи отфильтрованы
  // ещё до данных (см. AnalyticsView), но запись нужна для типа Record<Status>.
  cancelled:   '#94a3b8',
}

export const ASSIGNEE_HEX: Record<string, string> = {
  nick:  '#6366f1',
  galya: '#ec4899',
  none:  '#9ca3af',
}

const TOOLTIP_STYLE = {
  background: 'rgba(15, 23, 42, 0.9)',
  border: 'none', borderRadius: 8, color: '#fff', fontSize: 12,
}

export interface StatusDatum { name: string; value: number; status: Status }
export interface AssigneeDatum { name: string; value: number; key: string }
export type BarDatum = { label: string } & Record<Status, number>

/** Donut «По статусам». */
export function StatusDonut({ data }: { data: StatusDatum[] }) {
  return (
    <Card title="По статусам">
      {data.length === 0 ? <EmptyChart /> : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map(d => <Cell key={d.status} fill={STATUS_HEX[d.status]} stroke="none" />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v} задач`} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

/** Donut «По участникам». Сумма может быть > числа задач (несколько ассайни). */
export function AssigneeDonut({ data }: { data: AssigneeDatum[] }) {
  return (
    <Card title="По участникам">
      {data.length === 0 ? <EmptyChart /> : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map(d => <Cell key={d.key} fill={ASSIGNEE_HEX[d.key]} stroke="none" />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v} задач`} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

/** Stacked bar «Создано задач» — раздел секции (без обводки). */
export function CreatedBar({ data }: { data: BarDatum[] }) {
  return (
    <Section title="Создано задач">
      {data.length === 0 ? <EmptyChart /> : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb33" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconSize={10} />
            <Bar dataKey="todo"        stackId="a" fill={STATUS_HEX.todo}        name={STATUSES.todo.label}        radius={[0, 0, 0, 0]} />
            <Bar dataKey="in_progress" stackId="a" fill={STATUS_HEX.in_progress} name={STATUSES.in_progress.label} />
            <Bar dataKey="paused"      stackId="a" fill={STATUS_HEX.paused}      name={STATUSES.paused.label} />
            <Bar dataKey="done"        stackId="a" fill={STATUS_HEX.done}        name={STATUSES.done.label}        radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Section>
  )
}
