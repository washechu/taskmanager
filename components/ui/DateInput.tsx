'use client'

import type { InputHTMLAttributes } from 'react'
import { Input } from './Input'

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string
  /** Передаётся пустая строка при очистке. */
  onChange: (value: string) => void
  invalid?: boolean
}

/**
 * Input type=date с кнопкой очистки справа. Нативный пикер iOS Safari
 * не всегда отдаёт пустое значение через «Сбросить», поэтому даём явную
 * кнопку очистки прямо в поле.
 */
export function DateInput({ value, onChange, invalid, ...rest }: DateInputProps) {
  return (
    <div className="relative">
      <Input
        {...rest}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        invalid={invalid}
        className={value ? 'pr-9' : ''}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Очистить дату"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          ✕
        </button>
      )}
    </div>
  )
}
