'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export type SegmentOption<T extends string> = {
  value: T
  label: ReactNode
  href?: string
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[]
  value: T
  onChange?: (value: T) => void
  /**
   * `view`   — белая пилюля на сером треке; для переключения вида/экрана.
   * `filter` — синяя заливка активного; для выбора фильтра/параметра.
   * Если на одном экране нужны два контрола разной семантики — обязаны быть разных вариантов.
   */
  variant?: 'view' | 'filter'
  /** Растянуть на всю ширину родителя (равные колонки). По умолчанию — по контенту. */
  fullWidth?: boolean
  ariaLabel?: string
  className?: string
}

export function SegmentedControl<T extends string>({
  options, value, onChange, variant = 'filter', fullWidth = false, ariaLabel, className = '',
}: SegmentedControlProps<T>) {
  const isView = variant === 'view'

  const root = isView
    ? `gap-1 rounded-xl bg-gray-100 p-3 dark:bg-gray-800 ${fullWidth ? 'grid w-full' : 'inline-grid'}`
    : `flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 ${fullWidth ? 'w-full' : 'w-max'}`

  const segmentBase = isView
    ? 'flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors'
    : `flex h-10 items-center justify-center px-4 text-sm font-medium transition-colors ${fullWidth ? 'flex-1' : ''}`

  const activeCls = isView
    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
    : 'bg-blue-600 text-white'

  const inactiveCls = isView
    ? 'text-gray-400 dark:text-gray-500'
    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${root} ${className}`}
      style={isView ? { gridTemplateColumns: `repeat(${options.length}, minmax(max-content, 1fr))` } : undefined}
    >
      {options.map(opt => {
        const active = opt.value === value
        const cls = `${segmentBase} ${active ? activeCls : inactiveCls}`
        if (opt.href) {
          return (
            <Link key={opt.value} href={opt.href} className={cls} role="tab" aria-selected={active}>
              {opt.label}
            </Link>
          )
        }
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange?.(opt.value)}
            className={cls}
            role="tab"
            aria-selected={active}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
