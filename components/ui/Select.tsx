'use client'

import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Красная рамка для error-состояния. */
  invalid?: boolean
}

/**
 * Нативный <select> со стандартным shell'ом дизайн-системы:
 * h-10, rounded-lg, общий border, шрифт text-sm. Кастомный chevron — из
 * глобального правила в `app/globals.css` (правый паддинг 32px учтён там же).
 *
 * Внутри flex-Field берёт ширину по контенту; внутри формы — добавь
 * `className="w-full"` или оберни в block-контейнер.
 */
export function Select({ invalid, className = '', children, ...rest }: SelectProps) {
  const borderCls = invalid
    ? 'border-red-400 dark:border-red-500'
    : 'border-gray-200 dark:border-gray-700'

  return (
    <select
      {...rest}
      className={`h-10 rounded-lg border bg-white pl-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-300 ${borderCls} ${className}`}
    >
      {children}
    </select>
  )
}
