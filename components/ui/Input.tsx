'use client'

import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Красная рамка для error-состояния. */
  invalid?: boolean
}

/**
 * Текстовый input со стандартным shell'ом: h-10, rounded-lg, общий
 * border, шрифт text-sm. Подходит для text/email/password/date — тип
 * передаётся как обычный prop.
 */
export function Input({ invalid, className = '', ...rest }: InputProps) {
  const borderCls = invalid
    ? 'border-red-400 dark:border-red-500'
    : 'border-gray-200 dark:border-gray-700'

  return (
    <input
      {...rest}
      className={`h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-300 ${borderCls} ${className}`}
    />
  )
}
