'use client'

import { useState } from 'react'
import { CATEGORIES, ASSIGNEES, type Category, type Assignee } from '@/lib/types'
import type { Project } from '@/lib/types'
import { useTags } from '@/lib/hooks/useTags'
import { TagChip } from '@/components/ui/TagChip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

export interface TaskFilterState {
  category: Category | 'all'
  projectId: string | 'all'
  assignee: Assignee | 'all'
  tags: string[]
}

interface TaskFiltersProps {
  filters: TaskFilterState
  projects: Project[]
  /** Current user's assignee — when category=personal, tasks auto-scope to this person */
  currentUserAssignee?: Assignee | null
  onChange: (filters: TaskFilterState) => void
  /** Optional action slot rendered on the right side */
  rightAction?: React.ReactNode
}

// Unified control tokens — match the Analytics "Период" control:
// 40px tall (h-10), text-sm, rounded-lg, same borders.
const SELECT_CLASS =
  'h-10 rounded-lg border border-gray-200 bg-white pl-3 text-sm ' +
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

export function TaskFilters({ filters, projects, currentUserAssignee, onChange, rightAction }: TaskFiltersProps) {
  const { tags: allTags } = useTags()
  const [open, setOpen] = useState(false) // mobile-only state

  const set = <K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) =>
    onChange({ ...filters, [key]: value })

  const toggleTag = (tag: string) => {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    set('tags', tags)
  }

  const handleCategoryChange = (cat: Category | 'all') => {
    if (cat === 'personal') onChange({ ...filters, category: cat, assignee: 'all' })
    else onChange({ ...filters, category: cat })
  }

  const isPersonal = filters.category === 'personal'

  // Active filter count (excluding category since it's a primary tab control)
  const activeCount =
    (filters.projectId !== 'all' ? 1 : 0) +
    (!isPersonal && filters.assignee !== 'all' ? 1 : 0) +
    filters.tags.length

  return (
    <div className="py-3">
      {/* TOP BAR: category tabs always visible + (mobile) collapsible toggle + rightAction */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Category tabs — always shown */}
          <SegmentedControl
            variant="filter"
            value={filters.category}
            onChange={handleCategoryChange}
            ariaLabel="Категория"
            options={[
              { value: 'all'      as const, label: 'Все'                  },
              { value: 'personal' as const, label: CATEGORIES.personal.label },
              { value: 'family'   as const, label: CATEGORIES.family.label   },
            ]}
          />

          {/* Mobile-only filter toggle */}
          <button
            onClick={() => setOpen(o => !o)}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-4 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
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

      {/* SECONDARY ROW — visible inline on desktop; collapsible on mobile */}
      <div className={`${open ? 'flex' : 'hidden'} mt-3 flex-wrap items-center gap-x-5 gap-y-2 md:!flex md:mt-2`}>
        {/* Desktop divider before secondary filters */}
        <Divider />

        <Field label="Проект">
          <select
            value={filters.projectId}
            onChange={e => set('projectId', e.target.value as string)}
            className={SELECT_CLASS}
          >
            <option value="all">Все</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </Field>

        {!isPersonal && (
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
        )}

        {isPersonal && currentUserAssignee && (
          <span className="text-[11px] italic text-gray-400">
            Показаны только твои задачи · {ASSIGNEES[currentUserAssignee].label}
          </span>
        )}
      </div>

      {/* TAGS ROW — same visibility logic */}
      {allTags.length > 0 && (
        <div className={`${open ? 'flex' : 'hidden'} mt-3 flex-wrap items-center gap-x-2 gap-y-1.5 md:!flex`}>
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

export function applyTaskFilters<T extends { category: string; project_id: string | null; assignee: string | null; tags: string[]; created_at: string }>(
  tasks: T[],
  filters: TaskFilterState,
  currentUserAssignee?: Assignee | null,
): T[] {
  const effectiveAssignee: string | 'all' =
    filters.category === 'personal' && currentUserAssignee
      ? currentUserAssignee
      : filters.assignee

  return tasks
    .filter(task => {
      if (filters.category !== 'all' && task.category !== filters.category) return false
      if (filters.projectId !== 'all' && task.project_id !== filters.projectId) return false

      if (effectiveAssignee !== 'all') {
        if (filters.category === 'personal') {
          if (task.assignee !== null && task.assignee !== effectiveAssignee) return false
        } else {
          if (task.assignee !== effectiveAssignee) return false
        }
      }

      if (filters.tags.length > 0 && !filters.tags.every(t => task.tags.includes(t))) return false
      return true
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}
