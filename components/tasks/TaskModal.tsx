'use client'

import { useState } from 'react'
import { TaskForm } from './TaskForm'
import { CommentSection } from './CommentSection'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { TagChip } from '@/components/ui/TagChip'
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
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {editing ? 'Редактировать задачу' : task.title}
          </h2>
          <div className="flex items-center gap-2">
            {!editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                  title="Редактировать"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                  title="Удалить"
                >
                  🗑️
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
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
              {task.description && (
                <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{task.description}</p>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {task.due_date && (
                  <div>
                    <span className="text-xs text-gray-400">Дедлайн</span>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{task.due_date}</p>
                  </div>
                )}
                {task.start_date && (
                  <div>
                    <span className="text-xs text-gray-400">Начало</span>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{task.start_date}</p>
                  </div>
                )}
                {task.assignee && (
                  <div>
                    <span className="text-xs text-gray-400">Ответственный</span>
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      {task.assignee === 'nick' ? 'Никита' : 'Галочка'}
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
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Удалить задачу?"
        message="Задача будет удалена безвозвратно вместе со всеми комментариями."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
