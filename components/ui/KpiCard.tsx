'use client'

export type KpiAccent = 'green' | 'blue' | 'yellow' | 'red'

const ACCENT_CLASS: Record<KpiAccent, string> = {
  green:  'text-green-600 dark:text-green-400',
  blue:   'text-blue-600 dark:text-blue-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  red:    'text-red-600 dark:text-red-400',
}

/**
 * Карточка-KPI: лейбл сверху, крупная цифра снизу. Если задан `onClick` —
 * рендерится как `<button>` с hover (для drill-down). Используется
 * в Аналитике (верхний ряд из 4 чисел).
 */
export function KpiCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string
  value: number
  accent?: KpiAccent
  /** Если задан — карточка кликабельная. */
  onClick?: () => void
}) {
  const accentClass = accent ? ACCENT_CLASS[accent] : 'text-gray-900 dark:text-white'
  const body = (
    <>
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accentClass}`}>{value}</p>
    </>
  )
  const base = 'rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900'
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`block w-full text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${base}`}
      >
        {body}
      </button>
    )
  }
  return <div className={base}>{body}</div>
}
