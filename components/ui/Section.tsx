import type { ReactNode } from 'react'

/**
 * Заголовок секции с линией снизу — для крупных блоков (используется
 * в Аналитике, в модалках задач и привычек). Контент идёт под ним без
 * бордера-обёртки. Внешний отступ задаётся через `className`.
 */
export function Section({
  title,
  children,
  className = 'mt-6',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
        {title}
      </h3>
      {children}
    </div>
  )
}
