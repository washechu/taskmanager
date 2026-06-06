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
import { CATEGORIES, ASSIGNEES } from '@/lib/types'
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
          defaultAssignee={currentUser}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Сохранить"
        />
      ) : (
            <div className="space-y-4">
              <InviteBlock task={task} currentUser={currentUser} onUpdate={onUpdate} />

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
                      {task.assignees.length > 1 ? 'Участники' : 'Участник'}
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

/**
 * Блок ответа на семейное предложение. Логика:
 *   • invite_status='pending' и я НЕ инициатор → 3 кнопки (Принять / Думаю / Отклонить)
 *   • invite_status='pending' и я инициатор → «Ждём ответа от …»
 *   • invite_status='accepted'/'tentative' → чип со статусом + (если я отвечавший)
 *     кнопка переключения между accepted ↔ tentative
 *   • Иначе не рендерим ничего
 */
function InviteBlock({
  task, currentUser, onUpdate,
}: {
  task: Task
  currentUser: Assignee
  onUpdate: (id: string, updates: Partial<Task>) => Promise<{ error: unknown }>
}) {
  const isInviter = task.invited_by === currentUser
  const otherParticipant = task.assignees.find(a => a !== task.invited_by) ?? null

  // Pending — поверх всего
  if (task.invite_status === 'pending') {
    if (isInviter) {
      return (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          ⏳ Ждём ответа от <b>{otherParticipant ? ASSIGNEES[otherParticipant].label : '…'}</b>
        </div>
      )
    }
    const decline = () => {
      // Отклонить = задача возвращается одному invited_by, invite_status='none'
      if (!task.invited_by) return
      onUpdate(task.id, { invite_status: 'none', assignees: [task.invited_by] })
    }
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          👋 <b>{task.invited_by ? ASSIGNEES[task.invited_by].label : 'Партнёр'}</b> предложил тебе задачу. Что скажешь?
        </p>
        <div className="mt-3 flex items-center gap-1">
          <IconButton size="sm" onClick={() => onUpdate(task.id, { invite_status: 'accepted' })} title="Принять" aria-label="Принять">✅</IconButton>
          <IconButton size="sm" onClick={() => onUpdate(task.id, { invite_status: 'tentative' })} title="Думаю" aria-label="Думаю">🤔</IconButton>
          <IconButton size="sm" tone="danger" onClick={decline} title="Отклонить" aria-label="Отклонить">❌</IconButton>
        </div>
      </div>
    )
  }

  // Финальный статус — accepted / tentative
  if (task.invite_status === 'accepted' || task.invite_status === 'tentative') {
    const canSwitch = !isInviter
    const decline = () => {
      if (!task.invited_by) return
      onUpdate(task.id, { invite_status: 'none', assignees: [task.invited_by] })
    }
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-gray-900 dark:text-gray-100">
            {task.invite_status === 'accepted'
              ? <>✅ <b>{otherParticipant ? ASSIGNEES[otherParticipant].label : '…'}</b> принял предложение</>
              : <>🤔 <b>{otherParticipant ? ASSIGNEES[otherParticipant].label : '…'}</b> думает</>}
          </span>
          {canSwitch && (
            <div className="flex items-center gap-1">
              {task.invite_status === 'tentative' && (
                <IconButton size="sm" onClick={() => onUpdate(task.id, { invite_status: 'accepted' })} title="Принять" aria-label="Принять">✅</IconButton>
              )}
              {task.invite_status === 'accepted' && (
                <IconButton size="sm" onClick={() => onUpdate(task.id, { invite_status: 'tentative' })} title="Думаю" aria-label="Думаю">🤔</IconButton>
              )}
              <IconButton size="sm" tone="danger" onClick={decline} title="Отклонить" aria-label="Отклонить">❌</IconButton>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 'none' / 'declined' / отсутствие приглашения — ничего не показываем.
  // История ответа всё равно видна в audit-комментариях ниже.
  return null
}
