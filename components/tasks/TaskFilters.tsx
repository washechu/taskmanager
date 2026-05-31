'use client'

import { CATEGORIES, ASSIGNEES, type Category, type Assignee } from '@/lib/types'
import type { Project } from '@/lib/types'
import { useTags } from '@/lib/hooks/useTags'
import { TagChip } from '@/components/ui/TagChip'

export type SortKey = 'created' | 'due_date' | 'priority' | 'title'

export interface TaskFilterState {
  category: Category | 'all'
  projectId: string | 'all'
  assignee: Assignee | 'all'
  tags: string[]
  sort: SortKey
}

interface TaskFiltersProps {
  filters: TaskFilterState
  projects: Project[]
  onChange: (filters: TaskFilterState) => void
}

const SELECT_CLASS =
  'rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-3 text-xs ' +
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

export function TaskFilters({ filters, projects, onChange }: TaskFiltersProps) {
  const { tags: allTags } = useTags()

  const set = <K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) =>
    onChange({ ...filters, [key]: value })

  const toggleTag = (tag: string) => {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    set('tags', tags)
  }

  return (
    <div className="py-3">
      {/* Primary filter row: category tabs | secondary filters */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Category tabs */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
          {(['all', 'personal', 'family'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => set('category', cat)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                filters.category === cat
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              {cat === 'all' ? 'Все' : CATEGORIES[cat].label}
            </button>
          ))}
        </div>

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

        <Field label="Сортировка">
          <select
            value={filters.sort}
            onChange={e => set('sort', e.target.value as SortKey)}
            className={SELECT_CLASS}
          >
            <option value="created">По дате создания</option>
            <option value="priority">По приоритету</option>
            <option value="due_date">По дедлайну</option>
            <option value="title">По названию</option>
          </select>
        </Field>
      </div>

      {/* Tags row — separated below */}
      {allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
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

export function applyTaskFilters<T extends { category: string; project_id: string | null; assignee: string | null; priority: string; tags: string[]; due_date: string | null; created_at: string; title: string }>(
  tasks: T[],
  filters: TaskFilterState,
): T[] {
  const filtered = tasks.filter(task => {
    if (filters.category !== 'all' && task.category !== filters.category) return false
    if (filters.projectId !== 'all' && task.project_id !== filters.projectId) return false
    if (filters.assignee !== 'all' && task.assignee !== filters.assignee) return false
    if (filters.tags.length > 0 && !filters.tags.every(t => task.tags.includes(t))) return false
    return true
  })

  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 }

  return [...filtered].sort((a, b) => {
    switch (filters.sort) {
      case 'priority':
        return priorityRank[a.priority] - priorityRank[b.priority]
      case 'due_date':
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      case 'title':
        return a.title.localeCompare(b.title)
      default:
        return b.created_at.localeCompare(a.created_at)
    }
  })
}
