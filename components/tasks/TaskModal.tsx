'use client'

import { useState } from 'react'
import { TaskForm } from './TaskForm'
import { CommentSection } from './CommentSection'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { IconButton } from '@/components/ui/IconButton'
import { TagChip } from '@/components/ui/TagChip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { CATEGORIES } from '@/lib/types'
import { useTags } from '@/lib/hooks/useTags'
import type { Task, Project, Assignee } from '@/lib/types'

interface TaskModalProps {
  task: Task
  projects: Project[]
  currentUser: Assignee
  onUpdate: (id: string, updates: Partial<Task>) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onClose: () => void
  onProjectOpen?: (projectId: string) => void
}

export function TaskModal({ task, projects, currentUser, onUpdate, onDelete, onClose, onProjectOpen }: TaskModalProps) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { tags: allTags } = useTags()

  const handleUpdate = async (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    await onUpdate(task.id, data)
    setEditing(false)
  }

  const handleDelete = async () => {
    await onDelete(task.id)
    onClose()
  }

  return (
    <Modal
      onClose={onClose}
      title={editing ? 'Редактировать задачу' : task.title}
      headerActions={!editing && (
        <>
          <IconButton size="sm" onClick={() => setEditing(true)} title="Редактировать" aria-label="Редактировать">✏️</IconButton>
          <IconButton size="sm" tone="danger" onClick={() => setConfirmDelete(true)} title="Удалить" aria-label="Удалить">🗑️</IconButton>
        </>
      )}
    >
      {editing ? (
        <TaskForm
          initial={task}
          projects={projects}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Сохранить"
        />
      ) : (
            <div className="space-y-4">
              {/* Status + Priority + Category badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {CATEGORIES[task.category].label}
                </span>
              </div>

              {task.description && (
                <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {task.due_date && (
                  <div>
                    <span className="text-xs text-gray-400">Дедлайн</span>
                    <p className="font-medium text-gray-600 dark:text-gray-100">{task.due_date}</p>
                  </div>
                )}
                {task.start_date && (
                  <div>
                    <span className="text-xs text-gray-400">Начало</span>
                    <p className="font-medium text-gray-600 dark:text-gray-100">{task.start_date}</p>
                  </div>
                )}
                {task.assignees.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400">
                      {task.assignees.length > 1 ? 'Ответственные' : 'Ответственный'}
                    </span>
                    <p className="font-medium text-gray-600 dark:text-gray-100">
                      {task.assignees.map(a => a === 'nick' ? 'Никита' : 'Галочка').join(' + ')}
                    </p>
                  </div>
                )}
                {task.project_id && (
                  <div>
                    <span className="text-xs text-gray-400">Проект</span>
                    <button
                      onClick={() => onProjectOpen?.(task.project_id!)}
                      className="block text-left font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                      disabled={!onProjectOpen}
                    >
                      {projects.find(p => p.id === task.project_id)?.title ?? '—'}
                      {onProjectOpen && ' →'}
                    </button>
                  </div>
                )}
              </div>

              {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map(tag => (
                    <TagChip key={tag} name={tag} tags={allTags} size="sm" />
                  ))}
                </div>
              )}

          <CommentSection taskId={task.id} currentUser={currentUser} />
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Удалить задачу?"
        message="Задача будет удалена безвозвратно вместе со всеми комментариями."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  )
}
