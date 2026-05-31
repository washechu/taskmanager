'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { STATUSES, type Status, type Task } from '@/lib/types'
import type { Project } from '@/lib/types'

const headerColors: Record<Status, string> = {
  todo:        'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
  in_progress: 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
  done:        'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  paused:      'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30',
}

interface KanbanColumnProps {
  status: Status
  tasks: Task[]
  projects: Project[]
  onTaskOpen: (task: Task) => void
  onStatusChange: (id: string, status: Status) => void
  onAddTask: (status: Status) => void
}

export function KanbanColumn({ status, tasks, projects, onTaskOpen, onStatusChange, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/50">
      {/* Column header */}
      <div className={`flex items-center justify-between rounded-t-xl border-b px-3 py-2.5 ${headerColors[status]}`}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {STATUSES[status].label}
          </h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-xs font-medium text-gray-500 dark:bg-gray-900/80">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="rounded-md p-1 text-gray-400 hover:bg-white/60 hover:text-gray-600 dark:hover:bg-gray-900/60"
          title="Добавить задачу"
        >
          +
        </button>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 p-2 transition-colors ${
          isOver ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
        }`}
        style={{ minHeight: 120 }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              projects={projects}
              onOpen={onTaskOpen}
              onStatusChange={onStatusChange}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <EmptyState
            text="Задач нет"
            actionLabel="+ Добавить"
            onAction={() => onAddTask(status)}
          />
        )}
      </div>
    </div>
  )
}
