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
  onChange: (filters: ProjectFilterState) => void
}

const LABEL_CLASS = 'text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500'

const Divider = () => (
  <span className="hidden h-6 w-px self-center bg-gray-200 dark:bg-gray-700 md:inline-block" />
)

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className={LABEL_CLASS}>{label}</span>
      {children}
    </label>
  )
}

export function ProjectFilters({ filters, onChange }: ProjectFiltersProps) {
  const set = <K extends keyof ProjectFilterState>(key: K, value: ProjectFilterState[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3">
      <SegmentedControl
        variant="filter"
        value={filters.category}
        onChange={(cat) => set('category', cat)}
        ariaLabel="Категория"
        options={[
          { value: 'personal' as const, label: CATEGORIES.personal.label },
          { value: 'family'   as const, label: CATEGORIES.family.label   },
        ]}
      />

      <Divider />

      <Field label="Ответственный">
        <Select value={filters.assignee} onChange={e => set('assignee', e.target.value as Assignee | 'all')}>
          <option value="all">Все</option>
          {Object.entries(ASSIGNEES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </Select>
      </Field>
    </div>
  )
}

export function applyProjectFilters<T extends { category: string; assignee: string | null; created_at: string }>(
  projects: T[],
  filters: ProjectFilterState,
): T[] {
  return projects
    .filter(p => {
      if (p.category !== filters.category) return false
      if (filters.assignee !== 'all' && p.assignee !== filters.assignee) return false
      return true
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}
