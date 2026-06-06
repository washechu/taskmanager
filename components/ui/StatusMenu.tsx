'use client'

import { useEffect, useRef, useState } from 'react'
import { STATUSES, STATUS_ORDER, type Status } from '@/lib/types'

const colorMap: Record<string, string> = {
  gray:   'bg-gray-100   text-gray-600   dark:bg-gray-800       dark:text-gray-300',
  blue:   'bg-blue-100   text-blue-700   dark:bg-blue-950       dark:text-blue-300',
  yellow: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/70  dark:text-yellow-200',
  green:  'bg-green-100  text-green-700  dark:bg-green-950      dark:text-green-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950     dark:text-orange-300',
}

interface StatusMenuProps {
  value: Status
  onChange: (status: Status) => void
}

/**
 * Кликабельный статус-бейдж: визуально как StatusBadge, но открывает
 * выпадайку с 4 статусами для быстрой смены без входа в edit-режим.
 * На мобиле даёт смену статуса в 1 тап.
 */
export function StatusMenu({ value, onChange }: StatusMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { label, color } = STATUSES[value]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${colorMap[color]}`}
      >
        {label}
        <span className="text-[10px] opacity-60">▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {STATUS_ORDER.map(s => {
            const isCurrent = s === value
            return (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={isCurrent}
                onClick={() => { onChange(s); setOpen(false) }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${isCurrent ? 'font-medium' : 'text-gray-600 dark:text-gray-300'}`}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${dotColor[STATUSES[s].color]}`} />
                {STATUSES[s].label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const dotColor: Record<string, string> = {
  gray:   'bg-gray-400',
  blue:   'bg-blue-500',
  yellow: 'bg-yellow-500',
  green:  'bg-green-500',
  orange: 'bg-orange-500',
}
