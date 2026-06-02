'use client'

import { useState } from 'react'
import {
  STATUSES, PRIORITIES, CATEGORIES, ASSIGNEES, STATUS_ORDER,
  type Task, type Status, type Priority, type Category, type Assignee
} from '@/lib/types'
import type { Project } from '@/lib/types'
import { TagPicker } from '@/components/ui/TagPicker'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { TextArea } from '@/components/ui/TextArea'
import { DateInput } from '@/components/ui/DateInput'

type TaskFormData = Omit<Task, 'id' | 'created_at' | 'updated_at'>

interface TaskFormProps {
  initial?: Partial<TaskFormData>
  projects: Project[]
  defaultAssignee?: Assignee | null
  onSubmit: (data: TaskFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'

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
            {STATUS_ORDER.map(s => (
              <option key={s} value={s}>{STATUSES[s].label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className={LABEL_CLASS}>Приоритет</label>
          <Select value={form.priority} onChange={e => set('priority', e.target.value as Priority)} className="w-full">
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>

        <div>
          <label className={LABEL_CLASS}>Категория</label>
          <Select value={form.category} onChange={e => set('category', e.target.value as Category)} className="w-full">
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
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
          {needsAssignee && (
            <p className="mt-0.5 text-xs text-red-500">Для семейных задач укажите ответственного</p>
          )}
        </div>

        <div>
          <label className={LABEL_CLASS}>Начало</label>
          <DateInput
            value={form.start_date ?? ''}
            onChange={v => set('start_date', v || null)}
            invalid={!!dateError}
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Дедлайн</label>
          <DateInput
            value={form.due_date ?? ''}
            onChange={v => set('due_date', v || null)}
            invalid={!!dateError}
          />
        </div>
        {dateError && (
          <p className="col-span-2 -mt-2 text-xs text-red-500">{dateError}</p>
        )}
      </div>

      <div>
        <label className={LABEL_CLASS}>Проект</label>
        <Select
          value={form.project_id ?? ''}
          onChange={e => set('project_id', e.target.value || null)}
          className="w-full"
        >
          <option value="">Без проекта</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className={LABEL_CLASS}>Теги</label>
        <TagPicker selected={form.tags} onChange={tags => set('tags', tags)} />
      </div>

      <div>
        <label className={LABEL_CLASS}>Описание</label>
        <TextArea
          value={form.description ?? ''}
          onChange={e => set('description', e.target.value || null)}
          rows={3}
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
