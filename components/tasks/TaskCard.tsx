'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { TagChip } from '@/components/ui/TagChip'
import { CATEGORIES, ASSIGNEES, type Task, type Status } from '@/lib/types'
import type { Project } from '@/lib/types'
import { useTags } from '@/lib/hooks/useTags'
import { dueStatus, dueIcon } from '@/lib/dueStatus'
import { computeTaskStats, formatDays } from '@/lib/taskStats'

interface TaskCardProps {
  task: Task
  projects: Project[]
  onOpen: (task: Task) => void
  // Kept for backwards compat with KanbanBoard — not used anymore on card itself
  onStatusChange?: (id: string, status: Status) => void
  onProjectOpen?: (projectId: string) => void
}

export function TaskCard({ task, projects, onOpen, onProjectOpen }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const { tags: allTags } = useTags()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const project = projects.find(p => p.id === task.project_id)
  const due = dueStatus(task)
  const dueCls =
    due === 'overdue' ? 'text-red-500 font-medium' :
    due === 'today'   ? 'text-orange-500 font-medium' :
                        'text-gray-400'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Drag handle + title block — clicking title or description opens modal */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-gray-400 hover:text-gray-500 active:cursor-grabbing"
          tabIndex={-1}
          aria-label="Перетащить"
        >
          ⠿
        </button>
        <button
          onClick={() => onOpen(task)}
          className="flex-1 text-left"
        >
          <span className="block line-clamp-2 text-base font-medium leading-snug text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400 md:text-sm">
            {task.title}
          </span>
          {task.description?.trim() && (
            <span
              className="mt-1 block line-clamp-3 text-sm text-gray-400 dark:text-gray-500 md:text-xs"
              title={task.description}
            >
              {task.description.trim()}
            </span>
          )}
        </button>
      </div>

      {/* Meta */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        <PriorityBadge priority={task.priority} />
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {CATEGORIES[task.category].label}
        </span>
        {task.invite_status === 'pending' && (
          <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
            ⏳ Ждёт ответа
          </span>
        )}
        {task.invite_status === 'tentative' && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            🤔 Думает
          </span>
        )}
        {project && (
          <button
            onClick={e => { e.stopPropagation(); onProjectOpen?.(project.id) }}
            className="max-w-[160px] truncate rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-100 hover:underline dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
            title={`Перейти к проекту: ${project.title}`}
          >
            📁 {project.title}
          </button>
        )}
        {task.assignees.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {task.assignees.map(a => ASSIGNEES[a].label).join(' + ')}
          </span>
        )}
        {task.status === 'done' && task.completed_at ? (
          <span className="text-xs text-gray-400">
            ✓ {task.completed_at.substring(0, 10)}
          </span>
        ) : task.due_date && (
          <span className={`text-xs ${dueCls}`}>
            {due && due !== 'future' ? `${dueIcon(due)} ` : '📅 '}{task.due_date}
          </span>
        )}
        {task.status === 'in_progress' && task.start_date && (
          <span className="text-xs text-orange-600 dark:text-orange-400" title="В работе">
            ⏱ {formatDays(computeTaskStats(task).inProgressDays)}
          </span>
        )}
        {task.tags.slice(0, 3).map(tag => (
          <TagChip key={tag} name={tag} tags={allTags} />
        ))}
        {task.tags.length > 3 && (
          <span className="text-xs text-gray-400">+{task.tags.length - 3}</span>
        )}
      </div>
    </div>
  )
}
