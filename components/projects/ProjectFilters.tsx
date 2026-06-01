'use client'

import { useState } from 'react'
import { CATEGORIES, ASSIGNEES, type Category, type Assignee } from '@/lib/types'

export interface ProjectFilterState {
  category: Category | 'all'
  assignee: Assignee | 'all'
}

interface ProjectFiltersProps {
  filters: ProjectFilterState
  onChange: (filters: ProjectFilterState) => void
  /** Optional action slot rendered on the right side of the filter row */
  rightAction?: React.ReactNode
}

const SELECT_CLASS =
  'rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-3 text-sm md:text-xs ' +
  'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'

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

export function ProjectFilters({ filters, onChange, rightAction }: ProjectFiltersProps) {
  const [open, setOpen] = useState(false)

  const set = <K extends keyof ProjectFilterState>(key: K, value: ProjectFilterState[K]) =>
    onChange({ ...filters, [key]: value })

  const activeCount =
    (filters.assignee !== 'all' ? 1 : 0)

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            {(['all', 'personal', 'family'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => set('category', cat)}
                className={`px-3 py-2 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg md:py-1.5 ${
                  filters.category === cat
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {cat === 'all' ? 'Все' : CATEGORIES[cat].label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
          >
            <span>Фильтры</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
            <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
          </button>
        </div>

        {rightAction && <div>{rightAction}</div>}
      </div>

      <div className={`${open ? 'flex' : 'hidden'} mt-3 flex-wrap items-center gap-x-5 gap-y-2 md:!flex md:mt-2`}>
        <Divider />

        <Field label="Ответственный">
          <select
            value={filters.assignee}
            onChange={e => set('assignee', e.target.value as Assignee | 'all')}
            className={SELECT_CLASS}
          >
            <option value="all">Все</option>
            {Object.entries(ASSIGNEES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  )
}

export function applyProjectFilters<T extends { category: string; assignee: string | null; created_at: string }>(
  projects: T[],
  filters: ProjectFilterState,
): T[] {
  return projects
    .filter(p => {
      if (filters.category !== 'all' && p.category !== filters.category) return false
      if (filters.assignee !== 'all' && p.assignee !== filters.assignee) return false
      return true
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}
