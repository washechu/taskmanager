'use client'

/**
 * Пульсирующий плейсхолдер для loading-состояний. Размер и форма задаются
 * через `className` (h-/w-/rounded-).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-800 ${className}`}
      aria-hidden
    />
  )
}
