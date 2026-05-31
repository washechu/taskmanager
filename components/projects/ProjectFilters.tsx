'use client'

import { CATEGORIES, ASSIGNEES, type Category, type Assignee } from '@/lib/types'

export type ProjectSortKey = 'created' | 'due_date' | 'title' | 'status'

export interface ProjectFilterState {
  category: Category | 'all'
  assignee: Assignee | 'all'
  sort: ProjectSortKey
}

interface ProjectFiltersProps {
  filters: ProjectFilterState
  onChange: (filters: ProjectFilterState) => void
}

const SELECT_CLASS =
  'rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-xs ' +
  'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'

export function ProjectFilters({ filters, onChange }: ProjectFiltersProps) {
  const set = <K extends keyof ProjectFilterState>(key: K, value: ProjectFilterState[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
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

      <label className="flex items-center gap-1">
        <span className="text-xs text-gray-500">Ответственный:</span>
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
      </label>

      <label className="flex items-center gap-1">
        <span className="text-xs text-gray-500">Сортировка:</span>
        <select
          value={filters.sort}
          onChange={e => set('sort', e.target.value as ProjectSortKey)}
          className={SELECT_CLASS}
        >
          <option value="created">По дате создания</option>
          <option value="due_date">По дедлайну</option>
          <option value="status">По статусу</option>
          <option value="title">По названию</option>
        </select>
      </label>
    </div>
  )
}

const STATUS_RANK: Record<string, number> = { todo: 0, in_progress: 1, paused: 2, done: 3 }

export function applyProjectFilters<T extends { category: string; assignee: string | null; status: string; due_date: string | null; title: string; created_at: string }>(
  projects: T[],
  filters: ProjectFilterState,
): T[] {
  const filtered = projects.filter(p => {
    if (filters.category !== 'all' && p.category !== filters.category) return false
    if (filters.assignee !== 'all' && p.assignee !== filters.assignee) return false
    return true
  })

  return [...filtered].sort((a, b) => {
    switch (filters.sort) {
      case 'status':
        return STATUS_RANK[a.status] - STATUS_RANK[b.status]
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
