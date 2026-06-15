import type { ReactNode } from 'react'

/**
 * Контейнер-карточка с обводкой и фоном. Для группировки виджетов,
 * которые не должны сливаться с фоном страницы (доноры, KPI-карты).
 */
export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {children}
    </div>
  )
}

/** Плейсхолдер для пустого графика в Card. */
export function EmptyChart({ text = 'Нет данных за период' }: { text?: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
      {text}
    </div>
  )
}
