'use client'

import { useState } from 'react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { IconButton } from '@/components/ui/IconButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { TextArea } from '@/components/ui/TextArea'
import {
  STATUSES, CATEGORIES, ASSIGNEES, STATUS_ORDER,
  type Project, type Status, type Category, type Assignee,
} from '@/lib/types'
import type { Task } from '@/lib/types'

type ProjectFormData = Omit<Project, 'id' | 'created_at' | 'updated_at'>

interface ProjectModalProps {
  project: Project
  tasks: Task[]
  onUpdate: (id: string, updates: Partial<Project>) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onClose: () => void
  onTaskOpen?: (taskId: string) => void
  onCreateTask?: (projectId: string) => void
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'

export function ProjectForm({
  initial,
  defaultAssignee,
  onSubmit,
  onCancel,
  submitLabel = 'Сохранить',
}: {
  initial?: Partial<ProjectFormData>
  defaultAssignee?: Assignee | null
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}) {
  const [form, setForm] = useState<ProjectFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? null,
    status: initial?.status ?? 'todo',
    category: initial?.category ?? 'personal',
    assignee: initial?.assignee ?? defaultAssignee ?? null,
    start_date: initial?.start_date ?? null,
    due_date: initial?.due_date ?? null,
  })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ProjectFormData>(k: K, v: ProjectFormData[K]) => setForm(f => ({ ...f, [k]: v }))

  const needsAssignee = form.category === 'family' && !form.assignee
  const dateError = form.start_date && form.due_date && form.start_date > form.due_date
    ? 'Дата начала не может быть позже дедлайна'
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (dateError) return
    setSaving(true)
    await onSubmit(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={LABEL_CLASS}>Название *</label>
        <Input
          autoFocus
          value={form.title}
          onChange={e => set('title', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS}>Статус</label>
          <Select value={form.status} onChange={e => set('status', e.target.value as Status)} className="w-full">
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUSES[s].label}</option>)}
          </Select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Категория</label>
          <Select value={form.category} onChange={e => set('category', e.target.value as Category)} className="w-full">
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Ответственный {form.category === 'family' && <span className="text-red-500">*</span>}
          </label>
          <Select
            value={form.assignee ?? ''}
            onChange={e => set('assignee', (e.target.value as Assignee) || null)}
            invalid={needsAssignee}
            className="w-full"
          >
            <option value="">Не назначен</option>
            {Object.entries(ASSIGNEES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>
        <div />{/* spacer */}
        <div>
          <label className={LABEL_CLASS}>Начало</label>
          <Input
            type="date"
            value={form.start_date ?? ''}
            onChange={e => set('start_date', e.target.value || null)}
            invalid={!!dateError}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Дедлайн</label>
          <Input
            type="date"
            value={form.due_date ?? ''}
            onChange={e => set('due_date', e.target.value || null)}
            invalid={!!dateError}
          />
        </div>
        {dateError && (
          <p className="col-span-2 -mt-2 text-xs text-red-500">{dateError}</p>
        )}
      </div>

      <div>
        <label className={LABEL_CLASS}>Описание</label>
        <TextArea
          value={form.description ?? ''}
          onChange={e => set('description', e.target.value || null)}
          rows={3}
          placeholder="Цель проекта, к чему он ведёт"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={saving || !form.title.trim() || !!dateError}>
          {saving ? 'Сохранение...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

export function ProjectModal({ project, tasks, onUpdate, onDelete, onClose, onTaskOpen, onCreateTask }: ProjectModalProps) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const projectTasks = tasks.filter(t => t.project_id === project.id)
  const doneTasks = projectTasks.filter(t => t.status === 'done').length

  const handleUpdate = async (data: ProjectFormData) => {
    await onUpdate(project.id, data)
    setEditing(false)
  }

  const handleDelete = async () => {
    await onDelete(project.id)
    onClose()
  }

  return (
    <Modal
      onClose={onClose}
      title={editing ? 'Редактировать проект' : project.title}
      headerActions={!editing && (
        <>
          <IconButton size="sm" onClick={() => setEditing(true)} aria-label="Редактировать">✏️</IconButton>
          <IconButton size="sm" tone="danger" onClick={() => setConfirmDelete(true)} aria-label="Удалить">🗑️</IconButton>
        </>
      )}
    >
      {editing ? (
        <ProjectForm initial={project} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
      ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={project.status} />
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {CATEGORIES[project.category].label}
                </span>
                {project.assignee && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {ASSIGNEES[project.assignee].label}
                  </span>
                )}
              </div>

              {project.description && (
                <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{project.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {project.start_date && (
                  <div>
                    <span className="text-xs text-gray-400">Начало</span>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{project.start_date}</p>
                  </div>
                )}
                {project.due_date && (
                  <div>
                    <span className="text-xs text-gray-400">Дедлайн</span>
                    <p className="font-medium text-gray-700 dark:text-gray-200">{project.due_date}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs text-gray-400">
                  {projectTasks.length > 0 ? `Задачи: ${doneTasks}/${projectTasks.length}` : 'Задач пока нет'}
                </p>
                {projectTasks.length > 0 && (
                  <>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${(doneTasks / projectTasks.length) * 100}%` }}
                      />
                    </div>
                    <ul className="mt-2 space-y-0.5">
                      {projectTasks.slice(0, 15).map(t => (
                        <li key={t.id}>
                          <button
                            onClick={() => onTaskOpen?.(t.id)}
                            disabled={!onTaskOpen}
                            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs text-gray-600 hover:bg-gray-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400 disabled:hover:bg-transparent"
                          >
                            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${
                              t.status === 'done' ? 'bg-green-500' :
                              t.status === 'in_progress' ? 'bg-yellow-500' :
                              t.status === 'paused' ? 'bg-orange-500' :
                              'bg-gray-400'
                            }`} />
                            <span className="flex-1 truncate">{t.title}</span>
                            <span className="text-[10px] uppercase tracking-wide text-gray-400">
                              {STATUSES[t.status].label}
                            </span>
                            {onTaskOpen && <span className="opacity-60">→</span>}
                          </button>
                        </li>
                      ))}
                      {projectTasks.length > 15 && (
                        <li className="px-1.5 text-xs text-gray-400">…ещё {projectTasks.length - 15}</li>
                      )}
                    </ul>
                  </>
                )}
                {onCreateTask && (
                  <button
                    onClick={() => onCreateTask(project.id)}
                    className="mt-3 w-full rounded-lg border border-dashed border-blue-300 px-3 py-2 text-xs font-medium text-blue-600 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40"
                  >
                    + Создать задачу в проекте
                  </button>
                )}
              </div>
            </div>
          )}

      <ConfirmModal
        open={confirmDelete}
        title="Удалить проект?"
        message="Проект будет удалён. Связанные задачи останутся, но потеряют привязку к проекту."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  )
}
