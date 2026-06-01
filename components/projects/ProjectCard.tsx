'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CATEGORIES, ASSIGNEES, type Project } from '@/lib/types'
import type { Task } from '@/lib/types'

interface ProjectCardProps {
  project: Project
  tasks: Task[]
  onOpen: (project: Project) => void
}

export function ProjectCard({ project, tasks, onOpen }: ProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const projectTasks = tasks.filter(t => t.project_id === project.id)
  const doneTasks = projectTasks.filter(t => t.status === 'done').length
  const isOverdue = project.due_date && new Date(project.due_date) < new Date() && project.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
          tabIndex={-1}
        >
          ⠿
        </button>
        <button
          onClick={() => onOpen(project)}
          className="flex-1 text-left text-sm font-medium leading-snug text-gray-800 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400"
        >
          {project.title}
        </button>
      </div>

      {/* Description preview — always 3 lines reserved (height parity with task cards) */}
      <p
        className="mt-1 line-clamp-3 pl-6 text-xs text-gray-500 dark:text-gray-400"
        title={project.description ?? ''}
        style={{ minHeight: '3.6em' }}
      >
        {project.description?.trim() || ''}
      </p>

      {/* Meta */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {CATEGORIES[project.category].label}
        </span>
        {project.assignee && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {ASSIGNEES[project.assignee].label}
          </span>
        )}
        {projectTasks.length > 0 && (
          <span className="text-xs text-gray-400">
            {doneTasks}/{projectTasks.length} задач
          </span>
        )}
        {project.due_date && (
          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {isOverdue ? '⚠️ ' : '📅 '}{project.due_date}
          </span>
        )}
      </div>

      {projectTasks.length > 0 && (
        <div className="ml-6 mt-2 h-1.5 w-[calc(100%-1.5rem)] overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${(doneTasks / projectTasks.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
