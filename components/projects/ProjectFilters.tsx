'use client'

import { CATEGORIES, ASSIGNEES, type Category, type Assignee } from '@/lib/types'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'

export interface ProjectFilterState {
  category: Category
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

  const handleCategoryChange = (cat: Category) => {
    // Личное всегда скоупится на текущего пользователя — сбрасываем явный выбор
    if (cat === 'personal') onChange({ ...filters, category: cat, assignee: 'all' })
    else onChange({ ...filters, category: cat })
  }

  const isPersonal = filters.category === 'personal'

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
        ]}
      />

      {!isPersonal && (
        <Field label="Ответственный">
          <Select value={filters.assignee} onChange={e => set('assignee', e.target.value as Assignee | 'all')}>
            <option value="all">Все</option>
            {Object.entries(ASSIGNEES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </Field>
      )}

      {isPersonal && currentUserAssignee && (
        <span className="text-[11px] italic text-gray-400">
          Показаны только твои проекты · {ASSIGNEES[currentUserAssignee].label}
        </span>
      )}
    </div>
  )
}

export function applyProjectFilters<T extends { category: string; assignee: string | null; created_at: string }>(
  projects: T[],
  filters: ProjectFilterState,
  currentUserAssignee?: Assignee | null,
): T[] {
  const effectiveAssignee: string | 'all' =
    filters.category === 'personal' && currentUserAssignee
      ? currentUserAssignee
      : filters.assignee

  return projects
    .filter(p => {
      if (p.category !== filters.category) return false
      if (effectiveAssignee !== 'all') {
        if (filters.category === 'personal') {
          if (p.assignee !== null && p.assignee !== effectiveAssignee) return false
        } else {
          if (p.assignee !== effectiveAssignee) return false
        }
      }
      return true
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}
