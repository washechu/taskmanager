'use client'

import { Modal } from '@/components/ui/Modal'
import { STATUSES, type Task } from '@/lib/types'
import { formatShortDate } from '@/lib/dates'

interface DrillDownModalProps {
  title: string
  tasks: Task[]
  onTaskOpen: (task: Task) => void
  onClose: () => void
}

/**
 * Список задач за конкретным KPI. Клик по задаче закрывает модалку
 * и открывает задачу обычным `onTaskOpen`.
 */
export function DrillDownModal({ title, tasks, onTaskOpen, onClose }: DrillDownModalProps) {
  return (
    <Modal onClose={onClose} title={`${title} (${tasks.length})`}>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {tasks.map(t => (
          <li key={t.id}>
            <button
              onClick={() => onTaskOpen(t)}
              className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left hover:text-blue-600 dark:hover:text-blue-400"
            >
              <span className="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
                {t.title}
              </span>
              <span className="flex-shrink-0 text-xs text-gray-400">
                {STATUSES[t.status].label}
                {t.due_date && ` · ${formatShortDate(t.due_date)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
