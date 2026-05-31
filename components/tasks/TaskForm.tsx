'use client'

import { useState } from 'react'
import {
  STATUSES, PRIORITIES, CATEGORIES, ASSIGNEES, DEFAULT_TAGS, STATUS_ORDER,
  type Task, type Status, type Priority, type Category, type Assignee
} from '@/lib/types'
import type { Project } from '@/lib/types'

type TaskFormData = Omit<Task, 'id' | 'created_at' | 'updated_at'>

interface TaskFormProps {
  initial?: Partial<TaskFormData>
  projects: Project[]
  onSubmit: (data: TaskFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function TaskForm({ initial, projects, onSubmit, onCancel, submitLabel = 'Создать' }: TaskFormProps) {
  const [form, setForm] = useState<TaskFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? null,
    status: initial?.status ?? 'todo',
    priority: initial?.priority ?? 'medium',
    category: initial?.category ?? 'personal',
    project_id: initial?.project_id ?? null,
    assignee: initial?.assignee ?? null,
    due_date: initial?.due_date ?? null,
    start_date: initial?.start_date ?? null,
    tags: initial?.tags ?? [],
  })
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const set = <K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const toggleTag = (tag: string) => {
    set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag])
  }

  const addCustomTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      set('tags', [...form.tags, t])
    }
    setTagInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
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
          <select
            value={form.status}
            onChange={e => set('status', e.target.value as Status)}
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>{STATUSES[s].label}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Приоритет</label>
          <select
            value={form.priority}
            onChange={e => set('priority', e.target.value as Priority)}
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Категория</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value as Category)}
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
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
            className={`w-full rounded-lg border px-2 py-2 text-sm dark:bg-gray-800 dark:text-gray-200 ${
              needsAssignee ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
            }`}
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
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
        </div>

        {/* Due date */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Дедлайн</label>
          <input
            type="date"
            value={form.due_date ?? ''}
            onChange={e => set('due_date', e.target.value || null)}
            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
        </div>
      </div>

      {/* Project */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Проект</label>
        <select
          value={form.project_id ?? ''}
          onChange={e => set('project_id', e.target.value || null)}
          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
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
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_TAGS.map(tag => (
            <button
              type="button"
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                form.tags.includes(tag)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
            placeholder="Свой тег..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          <button
            type="button"
            onClick={addCustomTag}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            + Добавить
          </button>
        </div>
        {form.tags.filter(t => !DEFAULT_TAGS.includes(t)).map(tag => (
          <span
            key={tag}
            className="mt-1 mr-1 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs text-white"
          >
            {tag}
            <button type="button" onClick={() => toggleTag(tag)} className="ml-0.5">✕</button>
          </span>
        ))}
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
          disabled={saving || !form.title.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
