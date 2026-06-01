'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { STATUSES, type Status, type Task } from '@/lib/types'
import type { Project } from '@/lib/types'

const headerColors: Record<Status, string> = {
  todo:        'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
  in_progress: 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30',
  done:        'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  paused:      'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30',
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 }

interface KanbanColumnProps {
  status: Status
  tasks: Task[]
  projects: Project[]
  prioritySort: 'none' | 'desc' | 'asc'
  onTogglePrioritySort: () => void
  onTaskOpen: (task: Task) => void
  onProjectOpen: (projectId: string) => void
  onAddTask: (status: Status) => void
}

export function KanbanColumn({
  status, tasks, projects, prioritySort, onTogglePrioritySort,
  onTaskOpen, onProjectOpen, onAddTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  const sortedTasks = prioritySort === 'none'
    ? tasks
    : [...tasks].sort((a, b) => {
        const cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        return prioritySort === 'desc' ? cmp : -cmp
      })

  return (
    <div className="flex w-[85vw] max-w-[18rem] flex-shrink-0 snap-start flex-col rounded-xl border border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/50 md:w-72">
      {/* Column header */}
      <div className={`flex items-center justify-between rounded-t-xl border-b px-3 py-2.5 ${headerColors[status]}`}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {STATUSES[status].label}
          </h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/80 px-1.5 text-xs font-medium text-gray-500 dark:bg-gray-900/80">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePrioritySort}
            className={`rounded-md px-1.5 py-1 text-xs transition-colors ${
              prioritySort !== 'none'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                : 'text-gray-400 hover:bg-white/60 hover:text-gray-600 dark:hover:bg-gray-900/60'
            }`}
            title={
              prioritySort === 'none'  ? 'Сортировка по приоритету выключена' :
              prioritySort === 'desc'  ? 'Сначала высокий приоритет' :
                                         'Сначала низкий приоритет'
            }
            aria-label="Сортировать по приоритету"
          >
            {prioritySort === 'asc' ? '↑' : '↓'}
          </button>
          <button
            onClick={() => onAddTask(status)}
            className="rounded-md p-1 text-gray-400 hover:bg-white/60 hover:text-gray-600 dark:hover:bg-gray-900/60"
            title="Добавить задачу"
          >
            +
          </button>
        </div>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 p-2 transition-colors ${
          isOver ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
        }`}
        style={{ minHeight: 120 }}
      >
        <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              projects={projects}
              onOpen={onTaskOpen}
              onProjectOpen={onProjectOpen}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <EmptyState text="Задач нет" />
        )}
      </div>
    </div>
  )
}
