'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { CATEGORIES, STATUSES, type Task, type Status, STATUS_ORDER } from '@/lib/types'
import type { Project } from '@/lib/types'

interface TaskCardProps {
  task: Task
  projects: Project[]
  onOpen: (task: Task) => void
  onStatusChange: (id: string, status: Status) => void
}

export function TaskCard({ task, projects, onOpen, onStatusChange }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const project = projects.find(p => p.id === task.project_id)
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Drag handle + title */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          tabIndex={-1}
          aria-label="Перетащить"
        >
          ⠿
        </button>
        <button
          onClick={() => onOpen(task)}
          className="flex-1 text-left text-sm font-medium leading-snug text-gray-800 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400"
        >
          {task.title}
        </button>
      </div>

      {/* Meta */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        <PriorityBadge priority={task.priority} />
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {CATEGORIES[task.category].icon}
        </span>
        {project && (
          <span className="truncate rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            {project.title}
          </span>
        )}
        {task.assignee && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {task.assignee === 'nick' ? 'Ник' : 'Галя'}
          </span>
        )}
        {task.due_date && (
          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {isOverdue ? '⚠️ ' : '📅 '}{task.due_date}
          </span>
        )}
        {task.tags.slice(0, 2).map(tag => (
          <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {tag}
          </span>
        ))}
        {task.tags.length > 2 && (
          <span className="text-xs text-gray-400">+{task.tags.length - 2}</span>
        )}
      </div>

      {/* Quick status change */}
      <div className="mt-2 pl-6">
        <select
          value={task.status}
          onChange={e => onStatusChange(task.id, e.target.value as Status)}
          onClick={e => e.stopPropagation()}
          className="w-full rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-500 outline-none hover:border-gray-300 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400"
        >
          {STATUS_ORDER.map(s => (
            <option key={s} value={s}>{STATUSES[s].label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
