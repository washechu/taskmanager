'use client'

import { CATEGORIES, ASSIGNEES, type Category, type Assignee } from '@/lib/types'
import { useTags } from '@/lib/hooks/useTags'
import { TagChip } from '@/components/ui/TagChip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'

export interface TaskFilterState {
  category: Category | 'all'
  assignee: Assignee | 'all'
  tags: string[]
}

interface TaskFiltersProps {
  filters: TaskFilterState
  /** Current user's assignee — when category=personal, tasks auto-scope to this person */
  currentUserAssignee?: Assignee | null
  onChange: (filters: TaskFilterState) => void
}

const LABEL_CLASS = 'text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className={LABEL_CLASS}>{label}</span>
      {children}
    </label>
  )
}

export function TaskFilters({ filters, currentUserAssignee, onChange }: TaskFiltersProps) {
  const { tags: allTags } = useTags()

  const set = <K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) =>
    onChange({ ...filters, [key]: value })

  const toggleTag = (tag: string) => {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    set('tags', tags)
  }

  const handleCategoryChange = (cat: Category | 'all') => {
    // Личное и Все авто-скоупятся на текущего пользователя — сбрасываем явный выбор
    if (cat === 'personal' || cat === 'all') onChange({ ...filters, category: cat, assignee: 'all' })
    else onChange({ ...filters, category: cat })
  }

  // Auto-scope: в Личном и в Все показываем только свои задачи
  const isAutoScoped = filters.category === 'personal' || filters.category === 'all'

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-4 py-3">
      <SegmentedControl
        variant="filter"
        value={filters.category}
        onChange={handleCategoryChange}
        ariaLabel="Категория"
        options={[
          { value: 'personal' as const, label: CATEGORIES.personal.label },
          { value: 'family'   as const, label: CATEGORIES.family.label   },
          { value: 'all'      as const, label: 'Все' },
        ]}
      />

      {!isAutoScoped && (
        <Field label="Участник">
          <Select value={filters.assignee} onChange={e => set('assignee', e.target.value as Assignee | 'all')}>
            <option value="all">Все</option>
            {Object.entries(ASSIGNEES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </Field>
      )}

      {isAutoScoped && currentUserAssignee && (
        <span className="text-[11px] italic text-gray-400">
          Показаны только твои задачи · {ASSIGNEES[currentUserAssignee].label}
        </span>
      )}

      {allTags.length > 0 && (
        <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className={LABEL_CLASS}>Теги</span>
          {allTags.map(tag => (
            <TagChip
              key={tag.id}
              name={tag.name}
              color={tag.color}
              selected={filters.tags.includes(tag.name)}
              onClick={() => toggleTag(tag.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function applyTaskFilters<T extends { category: string; assignees: string[]; tags: string[]; created_at: string }>(
  tasks: T[],
  filters: TaskFilterState,
  currentUserAssignee?: Assignee | null,
): T[] {
  // Личное и Все авто-скоупятся на текущего пользователя.
  // Семейное — assignee из явного селекта (по умолчанию 'all').
  const effectiveAssignee: string | 'all' =
    (filters.category === 'personal' || filters.category === 'all') && currentUserAssignee
      ? currentUserAssignee
      : filters.assignee

  return tasks
    .filter(task => {
      if (filters.category !== 'all' && task.category !== filters.category) return false

      if (effectiveAssignee !== 'all') {
        // Личные задачи без ответственного считаем своими (loose personal).
        // Семейные без ответственного — нет (ответственного никто не взял).
        if (task.category === 'personal') {
          if (task.assignees.length > 0 && !task.assignees.includes(effectiveAssignee)) return false
        } else {
          if (!task.assignees.includes(effectiveAssignee)) return false
        }
      }

      if (filters.tags.length > 0 && !filters.tags.every(t => task.tags.includes(t))) return false
      return true
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}
