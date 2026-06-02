'use client'

import type { TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Красная рамка для error-состояния. */
  invalid?: boolean
}

/**
 * Многострочный input со стандартным shell'ом. Высота не фиксирована —
 * задаётся через стандартный prop `rows`. Шрифт text-sm, паддинг как у
 * Input по горизонтали.
 */
export function TextArea({ invalid, className = '', ...rest }: TextAreaProps) {
  const borderCls = invalid
    ? 'border-red-400 dark:border-red-500'
    : 'border-gray-200 dark:border-gray-700'

  return (
    <textarea
      {...rest}
      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-300 ${borderCls} ${className}`}
    />
  )
}
