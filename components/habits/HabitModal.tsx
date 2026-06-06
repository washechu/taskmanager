'use client'

import { useMemo, useState } from 'react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  ASSIGNEES, WEEKDAYS, TAG_COLORS,
  type Habit, type HabitLog, type Assignee, type HabitScheduleType,
} from '@/lib/types'
import {
  buildDoneSet,
  computeBestStreak,
  computeCompletionRate,
  computeCurrentStreak,
  computeTotalCompletions,
} from '@/lib/habitStats'

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300'

type HabitFormData = Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'archived'>

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

const SCHEDULE_OPTIONS = [
  { value: 'daily'     as const, label: 'Ежедневно' },
  { value: 'weekdays'  as const, label: 'Неделя'    },
  { value: 'monthdays' as const, label: 'Месяц'     },
]

/** Человекочитаемая подпись расписания привычки. */
export function scheduleLabel(habit: Pick<Habit, 'schedule_type' | 'weekdays' | 'monthdays'>): string {
  if (habit.schedule_type === 'daily') return 'Каждый день'
  if (habit.schedule_type === 'monthdays') {
    return habit.monthdays.length ? habit.monthdays.slice().sort((a, b) => a - b).join(', ') : 'Дни не выбраны'
  }
  // weekdays (дефолт)
  const days = WEEKDAYS.filter(d => habit.weekdays.includes(d.value)).map(d => d.short).join(', ')
  return days || 'Дни не выбраны'
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
    icon: initial?.icon ?? null,
    // Категория и ответственный в UI не задаются: привычки личные,
    // ответственный = создатель (defaultAssignee).
    category: initial?.category ?? 'personal',
    assignee: initial?.assignee ?? defaultAssignee ?? null,
    schedule_type: initial?.schedule_type ?? 'weekdays',
    weekdays: initial?.weekdays ?? [],
    monthdays: initial?.monthdays ?? [],
    color: initial?.color ?? 'blue',
  })
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof HabitFormData>(k: K, v: HabitFormData[K]) => setForm(f => ({ ...f, [k]: v }))

  const toggleWeekday = (d: number) =>
    set('weekdays', form.weekdays.includes(d)
      ? form.weekdays.filter(x => x !== d)
      : [...form.weekdays, d].sort((a, b) => a - b))

  const toggleMonthday = (d: number) =>
    set('monthdays', form.monthdays.includes(d)
      ? form.monthdays.filter(x => x !== d)
      : [...form.monthdays, d].sort((a, b) => a - b))

  // Валидация по типу расписания
  const needsDaysError: string | null =
    form.schedule_type === 'weekdays'  && form.weekdays.length === 0  ? 'Выбери хотя бы один день недели' :
    form.schedule_type === 'monthdays' && form.monthdays.length === 0 ? 'Выбери хотя бы одно число' :
    null

  const invalid = !form.title.trim() || !!needsDaysError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (invalid) return
    setSaving(true)
    // Перед отправкой подчищаем неиспользуемые массивы для соответствующих типов:
    // - daily: оба пустые
    // - weekdays: monthdays пустой
    // - monthdays: weekdays пустой
    const payload: HabitFormData = {
      ...form,
      weekdays:  form.schedule_type === 'weekdays'  ? form.weekdays  : [],
      monthdays: form.schedule_type === 'monthdays' ? form.monthdays : [],
    }
    await onSubmit(payload)
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
          placeholder="Например, английский"
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Расписание *</label>
        <SegmentedControl
          variant="filter"
          fullWidth
          value={form.schedule_type}
          onChange={(t: HabitScheduleType) => set('schedule_type', t)}
          ariaLabel="Тип расписания"
          options={SCHEDULE_OPTIONS}
        />
      </div>

      {form.schedule_type === 'weekdays' && (
        <div>
          <label className={LABEL_CLASS}>
            Дни недели <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-1.5">
            {WEEKDAYS.map(d => {
              const active = form.weekdays.includes(d.value)
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleWeekday(d.value)}
                  title={d.label}
                  className={`h-10 flex-1 rounded-lg text-xs font-medium transition-colors ${
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
          {needsDaysError && (
            <p className="mt-1.5 text-xs text-red-500">{needsDaysError}</p>
          )}
        </div>
      )}

      {form.schedule_type === 'monthdays' && (
        <div>
          <label className={LABEL_CLASS}>
            Числа месяца <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
              const active = form.monthdays.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleMonthday(d)}
                  className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Если в месяце нет выбранного числа (29 февраля), привычка просто не появится.
          </p>
          {needsDaysError && (
            <p className="mt-1.5 text-xs text-red-500">{needsDaysError}</p>
          )}
        </div>
      )}

      <div>
        <label className={LABEL_CLASS}>Цвет</label>
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
        <label className={LABEL_CLASS}>Описание</label>
        <TextArea
          value={form.description ?? ''}
          onChange={e => set('description', e.target.value || null)}
          rows={2}
          placeholder="Заметка (необязательно)"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={saving || invalid}>
          {saving ? 'Сохранение...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

interface HabitModalProps {
  habit: Habit
  logs: HabitLog[]
  onUpdate: (id: string, updates: Partial<Habit>) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onClose: () => void
}

export function HabitModal({ habit, logs, onUpdate, onDelete, onClose }: HabitModalProps) {
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

  const scheduleText = scheduleLabel(habit)

  return (
    <Modal
      onClose={onClose}
      title={
        <>
          {!editing && habit.icon && <span className="text-xl">{habit.icon}</span>}
          {editing ? 'Редактировать привычку' : habit.title}
        </>
      }
      headerActions={!editing && (
        <>
          <IconButton size="sm" onClick={() => setEditing(true)} aria-label="Редактировать">✏️</IconButton>
          <IconButton size="sm" tone="danger" onClick={() => setConfirmDelete(true)} aria-label="Удалить">🗑️</IconButton>
        </>
      )}
    >
      {editing ? (
        <HabitForm initial={habit} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400 dark:bg-gray-800 dark:text-gray-400">
              {scheduleText}
            </span>
            {habit.assignee && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400 dark:bg-gray-800 dark:text-gray-400">
                {ASSIGNEES[habit.assignee].label}
              </span>
            )}
          </div>
          {habit.description && (
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{habit.description}</p>
          )}
          <HabitStats habit={habit} logs={logs} />
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        title="Удалить привычку?"
        message="Привычка и все отметки выполнения будут удалены безвозвратно."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  )
}

/**
 * Базовая статистика по привычке. 4 числа:
 *   • Текущая серия — подряд выполненных запланированных дней до сегодня
 *   • Лучшая серия — самая длинная за всё время (capped 1 годом)
 *   • % за 30 дней — completion rate за последние 30 дней
 *   • Всего — суммарное число отметок
 *
 * Считается на клиенте поверх `habit_logs`. Дёшево, но обёрнуто в useMemo,
 * чтобы пересчёт не дергался зря при ре-рендерах модалки.
 */
function HabitStats({ habit, logs }: { habit: Habit; logs: HabitLog[] }) {
  // doneSet считаем один раз и переиспользуем в трёх метриках.
  const stats = useMemo(() => {
    const doneSet = buildDoneSet(habit.id, logs)
    return {
      current: computeCurrentStreak(habit, doneSet),
      best:    computeBestStreak(habit, doneSet),
      rate:    computeCompletionRate(habit, doneSet, 30),
      total:   computeTotalCompletions(habit.id, logs),
    }
  }, [habit, logs])

  // Цвет для completion rate: ≥70% зелёный, ≥40% жёлтый, <40% красный
  const rateColor = stats.rate === null ? 'muted'
    : stats.rate >= 70 ? 'green'
    : stats.rate >= 40 ? 'yellow'
                       : 'red'

  return (
    <div className="pt-2">
      <h4 className="mb-3 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:text-gray-100">
        Статистика
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="🔥 Серия" value={stats.current} color="orange" />
        <StatCard label="Лучшая"   value={stats.best}    color="amber" />
        <StatCard
          label="За 30 дней"
          value={stats.rate === null ? '—' : `${stats.rate}%`}
          color={rateColor}
        />
        <StatCard label="Всего"    value={stats.total}   color="blue" />
      </div>
    </div>
  )
}

const STAT_COLOR: Record<string, string> = {
  orange: 'text-orange-600 dark:text-orange-400',
  amber:  'text-amber-600  dark:text-amber-400',
  green:  'text-green-600  dark:text-green-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  red:    'text-red-600    dark:text-red-400',
  blue:   'text-blue-600   dark:text-blue-400',
  muted:  'text-gray-400',
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  // Нулевые/прочерк значения всегда серые — не визжат пустотой
  const isEmpty = value === 0 || value === '0' || value === '—'
  const valueCls = isEmpty ? STAT_COLOR.muted : STAT_COLOR[color]
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${valueCls}`}>
        {value}
      </div>
    </div>
  )
}
