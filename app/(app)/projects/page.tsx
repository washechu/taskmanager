'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProjectKanban } from '@/components/projects/ProjectKanban'
import { ProjectGantt } from '@/components/projects/ProjectGantt'
import { ProjectModal, ProjectForm } from '@/components/projects/ProjectModal'
import { ProjectFilters, applyProjectFilters, type ProjectFilterState } from '@/components/projects/ProjectFilters'
import { MobileViewTabs } from '@/components/ui/Navigation'
import { useProjects } from '@/lib/hooks/useProjects'
import { useTasks } from '@/lib/hooks/useTasks'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import type { Project } from '@/lib/types'

const DEFAULT_FILTERS: ProjectFilterState = {
  category: 'all',
  assignee: 'all',
  sort: 'created',
}

function ProjectsPageInner() {
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') ?? 'kanban') as 'kanban' | 'gantt'

  const { projects, loading, createProject, updateProject, deleteProject } = useProjects()
  const { tasks } = useTasks()
  const currentUser = useCurrentUser()
  const [creating, setCreating] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [filters, setFilters] = useState<ProjectFilterState>(DEFAULT_FILTERS)

  const filtered = applyProjectFilters(projects, filters)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Проекты</h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Крупные цели или направления, объединяющие несколько задач.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Проект
          </button>
        </div>
        <div className="mt-2">
          <MobileViewTabs basePath="/projects" subs={[
            { view: 'kanban', label: 'Канбан' },
            { view: 'gantt',  label: 'Гант'   },
          ]} />
        </div>
        <ProjectFilters filters={filters} onChange={setFilters} />
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Загрузка...</p>
          </div>
        ) : view === 'kanban' ? (
          <ProjectKanban
            projects={filtered}
            tasks={tasks}
            onMove={(id, status) => updateProject(id, { status })}
            onUpdate={updateProject}
            onDelete={deleteProject}
            onCreate={() => setCreating(true)}
          />
        ) : (
          <ProjectGantt
            projects={filtered}
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
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={e => e.target === e.currentTarget && setCreating(false)}
        >
          <div className="w-full max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Новый проект</h2>
            <ProjectForm
              defaultAssignee={currentUser.assignee}
              onSubmit={async (data) => {
                await createProject(data)
                setCreating(false)
              }}
              onCancel={() => setCreating(false)}
              submitLabel="Создать"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Загрузка...</div>}>
      <ProjectsPageInner />
    </Suspense>
  )
}
