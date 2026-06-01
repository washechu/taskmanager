'use client'

import { useState } from 'react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import {
  CATEGORIES, ASSIGNEES, WEEKDAYS, TAG_COLORS,
  type Habit, type Category, type Assignee,
} from '@/lib/types'

type HabitFormData = Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'archived'>

const SELECT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm ' +
  'outline-none focus:ring-2 focus:ring-blue-500 ' +
  'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'

// Solid dots for the color picker (как в TagPicker)
const COLOR_DOT: Record<string, string> = {
  gray:   'bg-gray-400',
  red:    'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-400',
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  purple: 'bg-purple-500',
  pink:   'bg-pink-500',
}

export function HabitForm({
  initial,
  defaultAssignee,
  onSubmit,
  onCancel,
  submitLabel = 'Сохранить',
}: {
  initial?: Partial<HabitFormData>
  defaultAssignee?: Assignee | null
  onSubmit: (data: HabitFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}) {
  const [form, setForm] = useState<HabitFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? null,
    category: initial?.category ?? 'personal',
    assignee: initial?.assignee ?? defaultAssignee ?? null,
    weekdays: initial?.weekdays ?? [],
    color: initial?.color ?? 'blue',
  })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof HabitFormData>(k: K, v: HabitFormData[K]) => setForm(f => ({ ...f, [k]: v }))

  const toggleDay = (d: number) =>
    set('weekdays', form.weekdays.includes(d)
      ? form.weekdays.filter(x => x !== d)
      : [...form.weekdays, d].sort((a, b) => a - b))

  const needsAssignee = form.category === 'family' && !form.assignee
  const needsDays = form.weekdays.length === 0
  const invalid = !form.title.trim() || needsAssignee || needsDays

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (invalid) return
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
          placeholder="Жужица, английский, зарядка…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Дни недели <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-1.5">
          {WEEKDAYS.map(d => {
            const active = form.weekdays.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                title={d.label}
                className={`h-9 flex-1 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {d.short}
              </button>
            )
          })}
        </div>
        {needsDays && (
          <p className="mt-1.5 text-xs text-red-500">Выбери хотя бы один день</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Категория</label>
          <select value={form.category} onChange={e => set('category', e.target.value as Category)} className={SELECT_CLASS}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
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
            {Object.entries(ASSIGNEES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Цвет</label>
        <div className="flex gap-1.5">
          {Object.keys(TAG_COLORS).map(key => {
            const active = form.color === key
            return (
              <button
                type="button"
                key={key}
                onClick={() => set('color', key)}
                title={TAG_COLORS[key].label}
                aria-label={TAG_COLORS[key].label}
                className={`h-5 w-5 rounded-full ${COLOR_DOT[key]} transition-transform ${
                  active
                    ? 'ring-2 ring-offset-2 ring-blue-500 ring-offset-white dark:ring-offset-gray-900 scale-110'
                    : 'hover:scale-110'
                }`}
              />
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Описание</label>
        <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value || null)} rows={2}
          placeholder="Заметка (необязательно)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
          Отмена
        </button>
        <button type="submit" disabled={saving || invalid}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Сохранение...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

interface HabitModalProps {
  habit: Habit
  onUpdate: (id: string, updates: Partial<Habit>) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onClose: () => void
}

export function HabitModal({ habit, onUpdate, onDelete, onClose }: HabitModalProps) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleUpdate = async (data: HabitFormData) => {
    await onUpdate(habit.id, data)
    setEditing(false)
  }

  const handleDelete = async () => {
    await onDelete(habit.id)
    onClose()
  }

  const dayLabels = WEEKDAYS.filter(d => habit.weekdays.includes(d.value)).map(d => d.short).join(', ')

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {editing ? 'Редактировать привычку' : habit.title}
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

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {editing ? (
            <HabitForm initial={habit} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {CATEGORIES[habit.category].label}
                </span>
                {habit.assignee && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {ASSIGNEES[habit.assignee].label}
                  </span>
                )}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {dayLabels || 'Дни не выбраны'}
                </span>
              </div>
              {habit.description && (
                <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{habit.description}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Удалить привычку?"
        message="Привычка и все отметки выполнения будут удалены безвозвратно."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
