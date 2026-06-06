'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ProjectKanban } from '@/components/projects/ProjectKanban'
import { ProjectGantt } from '@/components/projects/ProjectGantt'
import { ProjectModal, ProjectForm } from '@/components/projects/ProjectModal'
import { ProjectFilters, applyProjectFilters, type ProjectFilterState } from '@/components/projects/ProjectFilters'
import { MobileViewTabs } from '@/components/ui/Navigation'
import { Fab } from '@/components/ui/Fab'
import { Modal } from '@/components/ui/Modal'
import { useProjects } from '@/lib/hooks/useProjects'
import { useTasks } from '@/lib/hooks/useTasks'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import type { Project } from '@/lib/types'

const DEFAULT_FILTERS: ProjectFilterState = {
  category: 'all',
  assignee: 'all',
}

function ProjectsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = (searchParams.get('view') ?? 'kanban') as 'kanban' | 'gantt'
  const openProjectId = searchParams.get('open')

  const { projects, loading, createProject, updateProject, deleteProject } = useProjects()
  const { tasks } = useTasks()
  const currentUser = useCurrentUser()
  const [creating, setCreating] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [filters, setFilters] = useState<ProjectFilterState>(DEFAULT_FILTERS)

  // Auto-open project from URL (cross-nav from Task modal)
  useEffect(() => {
    if (!openProjectId) return
    const project = projects.find(p => p.id === openProjectId)
    if (project) setSelectedProject(project)
  }, [openProjectId, projects])

  const closeProjectModal = () => {
    setSelectedProject(null)
    if (openProjectId) {
      const sp = new URLSearchParams(searchParams.toString())
      sp.delete('open')
      router.replace(`/projects${sp.toString() ? `?${sp}` : ''}`, { scroll: false })
    }
  }

  const navigateToTask = (taskId: string) => {
    router.push(`/tasks?open=${taskId}`)
  }

  const navigateToCreateTask = (projectId: string) => {
    router.push(`/tasks?create=${projectId}`)
  }

  const filtered = applyProjectFilters(projects, filters, currentUser.assignee)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Проекты</h1>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Крупные цели или направления, объединяющие несколько задач.
          </p>
        </div>
        <div className="mt-4">
          <MobileViewTabs basePath="/projects" subs={[
            { view: 'kanban', label: 'Канбан', icon: '📋' },
            { view: 'gantt',  label: 'Гант',   icon: '📈' },
          ]} />
        </div>
        <ProjectFilters
          filters={filters}
          currentUserAssignee={currentUser.assignee}
          onChange={setFilters}
        />
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
            onProjectOpen={setSelectedProject}
          />
        ) : (
          <ProjectGantt
            projects={filtered}
            tasks={tasks}
            onProjectOpen={setSelectedProject}
            onTaskOpen={navigateToTask}
          />
        )}
      </div>

      <Fab label="Проект" onClick={() => setCreating(true)} />

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          tasks={tasks}
          currentUser={currentUser.assignee}
          onUpdate={async (id, updates) => {
            const result = await updateProject(id, updates)
            setSelectedProject(prev => prev ? { ...prev, ...updates } : null)
            return result
          }}
          onDelete={deleteProject}
          onClose={closeProjectModal}
          onTaskOpen={navigateToTask}
          onCreateTask={navigateToCreateTask}
        />
      )}

      {creating && (
        <Modal onClose={() => setCreating(false)} title="Новый проект" size="md">
          <ProjectForm
            defaultAssignee={currentUser.assignee}
            onSubmit={async (data) => {
              await createProject(data)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
            submitLabel="Создать"
          />
        </Modal>
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
