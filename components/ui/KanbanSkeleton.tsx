'use client'

import { Skeleton } from './Skeleton'

/**
 * Скелет канбана: 4 колонки со «шапкой» и 2-3 карточками-плейсхолдерами.
 * Используется и в `/tasks`, и в `/projects` (4 одинаковых колонки статусов).
 */
export function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {[0, 1, 2, 3].map(col => (
        <div key={col} className="flex w-[85vw] max-w-[18rem] flex-shrink-0 flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50/50 p-2 dark:border-gray-800 dark:bg-gray-950/50 md:w-72">
          <Skeleton className="h-6 w-24 rounded-md" />
          {[0, 1, 2].slice(0, 3 - col % 2).map(i => (
            <div key={i} className="space-y-2 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
