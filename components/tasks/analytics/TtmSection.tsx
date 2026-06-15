'use client'

import { useMemo } from 'react'
import { Section } from '@/components/ui/Section'
import { aggregateTtm } from '@/lib/taskStats'
import type { Task } from '@/lib/types'

interface TtmSectionProps {
  tasks: Task[]
  rangeStart: Date
  rangeEnd: Date
}

/**
 * Раздел «Сроки» — 3 KPI cycle/lead/queue avg за период.
 * Учитываются только done-задачи с completed_at в периоде и start_date.
 */
export function TtmSection({ tasks, rangeStart, rangeEnd }: TtmSectionProps) {
  const ttm = useMemo(() => aggregateTtm(tasks, rangeStart, rangeEnd), [tasks, rangeStart, rangeEnd])

  return (
    <Section title="Сроки (в днях, в среднем)">
      {ttm.count === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
          За период нет закрытых задач со старта работы — недостаточно данных
        </p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TtmKpi label="Cycle time" value={ttm.cycle} />
            <TtmKpi label="Lead time"  value={ttm.lead}  />
            <TtmKpi label="В очереди"  value={ttm.queue} />
          </div>
          <p className="text-xs text-gray-400">По {ttm.count} закрытым задачам за период</p>
        </>
      )}
    </Section>
  )
}

function TtmKpi({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
        {value === null ? '—' : value}
      </div>
    </div>
  )
}
