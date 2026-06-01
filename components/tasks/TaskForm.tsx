'use client'

import { useState } from 'react'
import {
  STATUSES, PRIORITIES, CATEGORIES, ASSIGNEES, STATUS_ORDER,
  type Task, type Status, type Priority, type Category, type Assignee
} from '@/lib/types'
import type { Project } from '@/lib/types'
import { TagPicker } from '@/components/ui/TagPicker'

type TaskFormData = Omit<Task, 'id' | 'created_at' | 'updated_at'>

interface TaskFormProps {
  initial?: Partial<TaskFormData>
  projects: Project[]
  defaultAssignee?: Assignee | null
  onSubmit: (data: TaskFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

const SELECT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm ' +
  'outline-none focus:ring-2 focus:ring-blue-500 ' +
  'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'

export function TaskForm({ initial, projects, defaultAssignee, onSubmit, onCancel, submitLabel = 'Создать' }: TaskFormProps) {
  const [form, setForm] = useState<TaskFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? null,
    status: initial?.status ?? 'todo',
    priority: initial?.priority ?? 'medium',
    category: initial?.category ?? 'personal',
    project_id: initial?.project_id ?? null,
    assignee: initial?.assignee ?? defaultAssignee ?? null,
    due_date: initial?.due_date ?? null,
    start_date: initial?.start_date ?? null,
    tags: initial?.tags ?? [],
  })
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) =>
    setForm(f => ({ ...f, [key]: value }))

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

  const needsAssignee = form.category === 'family' && !form.assignee

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Название *
        </label>
        <input
          autoFocus
          value={form.title}
          onChange={e => set('title', e.target.value)}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Status */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Статус</label>
          <select value={form.status} onChange={e => set('status', e.target.value as Status)} className={SELECT_CLASS}>
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>{STATUSES[s].label}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Приоритет</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value as Priority)} className={SELECT_CLASS}>
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Категория</label>
          <select value={form.category} onChange={e => set('category', e.target.value as Category)} className={SELECT_CLASS}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Ответственный {form.category === 'family' && <span className="text-red-500">*</span>}
          </label>
          <select
            value={form.assignee ?? ''}
            onChange={e => set('assignee', (e.target.value as Assignee) || null)}
            className={`${SELECT_CLASS} ${needsAssignee ? 'border-red-400' : ''}`}
          >
            <option value="">Не назначен</option>
            {Object.entries(ASSIGNEES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {needsAssignee && (
            <p className="mt-0.5 text-xs text-red-500">Для семейных задач укажите ответственного</p>
          )}
        </div>

        {/* Start date */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Начало</label>
          <input
            type="date"
            value={form.start_date ?? ''}
            onChange={e => set('start_date', e.target.value || null)}
            className={`w-full rounded-lg border px-2 py-2 text-sm dark:bg-gray-800 dark:text-gray-200 ${
              dateError ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
            }`}
          />
        </div>

        {/* Due date */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Дедлайн</label>
          <input
            type="date"
            value={form.due_date ?? ''}
            onChange={e => set('due_date', e.target.value || null)}
            className={`w-full rounded-lg border px-2 py-2 text-sm dark:bg-gray-800 dark:text-gray-200 ${
              dateError ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
            }`}
          />
        </div>
        {dateError && (
          <p className="col-span-2 -mt-2 text-xs text-red-500">{dateError}</p>
        )}
      </div>

      {/* Project */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Проект</label>
        <select
          value={form.project_id ?? ''}
          onChange={e => set('project_id', e.target.value || null)}
          className={SELECT_CLASS}
        >
          <option value="">Без проекта</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Теги</label>
        <TagPicker selected={form.tags} onChange={tags => set('tags', tags)} />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Описание</label>
        <textarea
          value={form.description ?? ''}
          onChange={e => set('description', e.target.value || null)}
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={saving || !form.title.trim() || !!dateError}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
