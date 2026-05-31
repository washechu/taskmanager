'use client'

import { useState } from 'react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  STATUSES, CATEGORIES, STATUS_ORDER,
  type Project, type Status, type Category
} from '@/lib/types'
import type { Task } from '@/lib/types'

type ProjectFormData = Omit<Project, 'id' | 'created_at' | 'updated_at'>

interface ProjectModalProps {
  project: Project
  tasks: Task[]
  onUpdate: (id: string, updates: Partial<Project>) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onClose: () => void
}

function ProjectForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ProjectFormData>
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState<ProjectFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? null,
    status: initial?.status ?? 'todo',
    category: initial?.category ?? 'personal',
    start_date: initial?.start_date ?? null,
    due_date: initial?.due_date ?? null,
  })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ProjectFormData>(k: K, v: ProjectFormData[K]) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSubmit(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Название *</label>
        <input
          autoFocus
          value={form.title}
          onChange={e => set('title', e.target.value)}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Статус</label>
          <select value={form.status} onChange={e => set('status', e.target.value as Status)}
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUSES[s].label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Категория</label>
          <select value={form.category} onChange={e => set('category', e.target.value as Category)}
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Начало</label>
          <input type="date" value={form.start_date ?? ''} onChange={e => set('start_date', e.target.value || null)}
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Дедлайн</label>
          <input type="date" value={form.due_date ?? ''} onChange={e => set('due_date', e.target.value || null)}
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Описание</label>
        <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value || null)} rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
          Отмена
        </button>
        <button type="submit" disabled={saving || !form.title.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </form>
  )
}

export function ProjectModal({ project, tasks, onUpdate, onDelete, onClose }: ProjectModalProps) {
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
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {editing ? 'Редактировать проект' : project.title}
          </h2>
          <div className="flex items-center gap-2">
            {!editing && (
              <>
                <button onClick={() => setEditing(true)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">✏️</button>
                <button onClick={() => setConfirmDelete(true)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950">🗑️</button>
              </>
            )}
            <button onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {editing ? (
            <ProjectForm initial={project} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={project.status} />
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {CATEGORIES[project.category].icon} {CATEGORIES[project.category].label}
                </span>
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

              {projectTasks.length > 0 && (
                <div>
                  <p className="mb-1 text-xs text-gray-400">Задачи: {doneTasks}/{projectTasks.length}</p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${(doneTasks / projectTasks.length) * 100}%` }}
                    />
                  </div>
                  <ul className="mt-2 space-y-1">
                    {projectTasks.slice(0, 10).map(t => (
                      <li key={t.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span>{t.status === 'done' ? '✅' : '⬜'}</span>
                        {t.title}
                      </li>
                    ))}
                    {projectTasks.length > 10 && (
                      <li className="text-xs text-gray-400">…ещё {projectTasks.length - 10}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Удалить проект?"
        message="Проект будет удалён. Связанные задачи останутся, но потеряют привязку к проекту."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
