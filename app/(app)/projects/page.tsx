'use client'

import { useState } from 'react'
import { ProjectKanban } from '@/components/projects/ProjectKanban'
import { ProjectGantt } from '@/components/projects/ProjectGantt'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { useProjects } from '@/lib/hooks/useProjects'
import { useTasks } from '@/lib/hooks/useTasks'
import { STATUSES, CATEGORIES, STATUS_ORDER, type Status, type Category } from '@/lib/types'
import type { Project } from '@/lib/types'

type ProjectView = 'kanban' | 'gantt'

const VIEWS: { id: ProjectView; label: string; icon: string }[] = [
  { id: 'kanban', label: 'Канбан', icon: '🗂️' },
  { id: 'gantt',  label: 'Гант',   icon: '📊' },
]

function CreateProjectModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<Status>('todo')
  const [category, setCategory] = useState<Category>('personal')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onSubmit({ title, status, category, description: null, start_date: null, due_date: null })
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Новый проект</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Название *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Статус</label>
              <select value={status} onChange={e => setStatus(e.target.value as Status)}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUSES[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Категория</label>
              <select value={category} onChange={e => setCategory(e.target.value as Category)}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
              Отмена
            </button>
            <button type="submit" disabled={saving || !title.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects()
  const { tasks } = useTasks()
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<ProjectView>('kanban')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Проекты</h1>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
              {VIEWS.map(v => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                    view === v.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="mr-1">{v.icon}</span>
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Проект
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Загрузка...</p>
          </div>
        ) : view === 'kanban' ? (
          <ProjectKanban
            projects={projects}
            tasks={tasks}
            onMove={(id, status) => updateProject(id, { status })}
            onUpdate={updateProject}
            onDelete={deleteProject}
            onCreate={() => setCreating(true)}
          />
        ) : (
          <ProjectGantt
            projects={projects}
            onProjectOpen={setSelectedProject}
          />
        )}
      </div>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          tasks={tasks}
          onUpdate={async (id, updates) => {
            const result = await updateProject(id, updates)
            setSelectedProject(prev => prev ? { ...prev, ...updates } : null)
            return result
          }}
          onDelete={deleteProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {creating && (
        <CreateProjectModal
          onSubmit={async (data) => { await createProject(data) }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  )
}
