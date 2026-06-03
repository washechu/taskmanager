'use client'

import { CATEGORIES, ASSIGNEES, type Category, type Assignee } from '@/lib/types'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'

export interface ProjectFilterState {
  category: Category | 'all'
  assignee: Assignee | 'all'
}

interface ProjectFiltersProps {
  filters: ProjectFilterState
  /** Current user — Личное автоматически скоупится на него (как у задач). */
  currentUserAssignee?: Assignee | null
  onChange: (filters: ProjectFilterState) => void
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

export function ProjectFilters({ filters, currentUserAssignee, onChange }: ProjectFiltersProps) {
  const set = <K extends keyof ProjectFilterState>(key: K, value: ProjectFilterState[K]) =>
    onChange({ ...filters, [key]: value })

  const handleCategoryChange = (cat: Category | 'all') => {
    // Личное и Все авто-скоупятся на текущего пользователя
    if (cat === 'personal' || cat === 'all') onChange({ ...filters, category: cat, assignee: 'all' })
    else onChange({ ...filters, category: cat })
  }

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
          Показаны только твои проекты · {ASSIGNEES[currentUserAssignee].label}
        </span>
      )}
    </div>
  )
}

export function applyProjectFilters<T extends { category: string; assignees: string[]; created_at: string }>(
  projects: T[],
  filters: ProjectFilterState,
  currentUserAssignee?: Assignee | null,
): T[] {
  const effectiveAssignee: string | 'all' =
    (filters.category === 'personal' || filters.category === 'all') && currentUserAssignee
      ? currentUserAssignee
      : filters.assignee

  return projects
    .filter(p => {
      if (filters.category !== 'all' && p.category !== filters.category) return false
      if (effectiveAssignee !== 'all') {
        if (p.category === 'personal') {
          if (p.assignees.length > 0 && !p.assignees.includes(effectiveAssignee)) return false
        } else {
          if (!p.assignees.includes(effectiveAssignee)) return false
        }
      }
      return true
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}
