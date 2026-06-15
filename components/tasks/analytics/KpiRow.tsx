'use client'

import { KpiCard } from '@/components/ui/KpiCard'
import type { Task } from '@/lib/types'

export interface KpiRowSlices {
  created:  Task[]
  closed:   Task[]
  active:   Task[]
  overdue:  Task[]
}

interface KpiRowProps {
  slices: KpiRowSlices
  onDrill: (title: string, tasks: Task[]) => void
}

/** Верхний ряд из 4 KPI-карт. Клик по непустой → drill-down модалка. */
export function KpiRow({ slices, onDrill }: KpiRowProps) {
  const { created, closed, active, overdue } = slices
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard
        label="Создано за период"
        value={created.length}
        onClick={created.length > 0 ? () => onDrill('Создано за период', created) : undefined}
      />
      <KpiCard
        label="Закрыто за период"
        value={closed.length}
        accent="green"
        onClick={closed.length > 0 ? () => onDrill('Закрыто за период', closed) : undefined}
      />
      <KpiCard
        label="В процессе сейчас"
        value={active.length}
        accent="yellow"
        onClick={active.length > 0 ? () => onDrill('В процессе сейчас', active) : undefined}
      />
      <KpiCard
        label="Просрочено сейчас"
        value={overdue.length}
        accent={overdue.length > 0 ? 'red' : undefined}
        onClick={overdue.length > 0 ? () => onDrill('Просрочено сейчас', overdue) : undefined}
      />
    </div>
  )
}
