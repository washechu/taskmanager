'use client'

import { CATEGORIES, PRIORITIES, DEFAULT_TAGS, type Category, type Priority, type Assignee } from '@/lib/types'
import type { Project } from '@/lib/types'

export interface TaskFilterState {
  category: Category | 'all'
  projectId: string | 'all'
  assignee: Assignee | 'all'
  priority: Priority | 'all'
  tags: string[]
}

interface TaskFiltersProps {
  filters: TaskFilterState
  projects: Project[]
  onChange: (filters: TaskFilterState) => void
}

export function TaskFilters({ filters, projects, onChange }: TaskFiltersProps) {
  const set = <K extends keyof TaskFilterState>(key: K, value: TaskFilterState[K]) =>
    onChange({ ...filters, [key]: value })

  const toggleTag = (tag: string) => {
    const tags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    set('tags', tags)
  }

  const hasFilters = filters.category !== 'all' || filters.projectId !== 'all' ||
    filters.assignee !== 'all' || filters.priority !== 'all' || filters.tags.length > 0

  const reset = () => onChange({ category: 'all', projectId: 'all', assignee: 'all', priority: 'all', tags: [] })

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
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

      {/* Project select */}
      <select
        value={filters.projectId}
        onChange={e => set('projectId', e.target.value as string)}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      >
        <option value="all">Все проекты</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>

      {/* Assignee */}
      <select
        value={filters.assignee}
        onChange={e => set('assignee', e.target.value as Assignee | 'all')}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      >
        <option value="all">Все</option>
        <option value="nick">Ник</option>
        <option value="galya">Галя</option>
      </select>

      {/* Priority */}
      <select
        value={filters.priority}
        onChange={e => set('priority', e.target.value as Priority | 'all')}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      >
        <option value="all">Все приоритеты</option>
        {Object.entries(PRIORITIES).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {DEFAULT_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
              filters.tags.includes(tag)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {hasFilters && (
        <button
          onClick={reset}
          className="text-xs text-gray-400 underline hover:text-gray-600"
        >
          Сбросить
        </button>
      )}
    </div>
  )
}

export function applyTaskFilters<T extends { category: string; project_id: string | null; assignee: string | null; priority: string; tags: string[] }>(
  tasks: T[],
  filters: TaskFilterState
): T[] {
  return tasks.filter(task => {
    if (filters.category !== 'all' && task.category !== filters.category) return false
    if (filters.projectId !== 'all' && task.project_id !== filters.projectId) return false
    if (filters.assignee !== 'all' && task.assignee !== filters.assignee) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    if (filters.tags.length > 0 && !filters.tags.every(t => task.tags.includes(t))) return false
    return true
  })
}
