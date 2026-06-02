'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'default' | 'danger'
  /** 'md' — h-10 w-10 (тач-таргет, по умолчанию). 'sm' — компактный для плотных мест. */
  size?: 'md' | 'sm'
  children: ReactNode
}

export function IconButton({
  tone = 'default', size = 'md', className = '', children, ...rest
}: IconButtonProps) {
  const toneCls = tone === 'danger'
    ? 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950'
    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200'

  const sizeCls = size === 'md' ? 'h-10 w-10' : 'h-8 w-8'

  return (
    <button
      {...rest}
      className={`flex items-center justify-center rounded-lg transition-colors disabled:cursor-default disabled:opacity-40 ${sizeCls} ${toneCls} ${className}`}
    >
      {children}
    </button>
  )
}
