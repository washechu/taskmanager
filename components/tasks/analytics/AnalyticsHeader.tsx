'use client'

import { SegmentedControl } from '@/components/ui/SegmentedControl'

export type Period = 'week' | 'month' | 'custom'

const PERIOD_OPTIONS = [
  { value: 'week'   as const, label: 'Неделя' },
  { value: 'month'  as const, label: 'Месяц'  },
  { value: 'custom' as const, label: 'Период' },
]

interface AnalyticsHeaderProps {
  period: Period
  onPeriodChange: (p: Period) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (v: string) => void
  onCustomToChange:   (v: string) => void
}

/** Шапка Аналитики: сегмент периода + (для custom) пара date-input. */
export function AnalyticsHeader({
  period, onPeriodChange, customFrom, customTo, onCustomFromChange, onCustomToChange,
}: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Период</span>
      <SegmentedControl
        variant="view"
        value={period}
        onChange={onPeriodChange}
        ariaLabel="Период аналитики"
        options={PERIOD_OPTIONS}
      />

      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-gray-400">с</span>
          <input
            type="date"
            value={customFrom}
            onChange={e => onCustomFromChange(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          />
          <span className="text-[11px] uppercase tracking-wide text-gray-400">по</span>
          <input
            type="date"
            value={customTo}
            onChange={e => onCustomToChange(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          />
        </div>
      )}
    </div>
  )
}
