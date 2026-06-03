'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { CalendarView } from '@/components/tasks/CalendarView'
import { ListView } from '@/components/tasks/ListView'
import { AnalyticsView } from '@/components/tasks/AnalyticsView'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskFilters, applyTaskFilters, type TaskFilterState } from '@/components/tasks/TaskFilters'
import { MobileViewTabs } from '@/components/ui/Navigation'
import { Fab } from '@/components/ui/Fab'
import { Modal } from '@/components/ui/Modal'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { createClient } from '@/lib/supabase/client'
import { diffTask } from '@/lib/diffTask'
import type { Task, Status } from '@/lib/types'

const DEFAULT_FILTERS: TaskFilterState = {
  category: 'personal',
  assignee: 'all',
  tags: [],
}

function TasksPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const view = (searchParams.get('view') ?? 'kanban') as 'kanban' | 'list' | 'calendar' | 'analytics'
  const openTaskId = searchParams.get('open')
  const createForProjectId = searchParams.get('create')

  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks()
  const { projects } = useProjects()
  const currentUser = useCurrentUser()
  const supabase = useMemo(() => createClient(), [])
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_FILTERS)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [creating, setCreating] = useState<{ projectId?: string | null } | null>(null)

  // Auto-open task from ?open=<id>
  useEffect(() => {
    if (!openTaskId) return
    const task = tasks.find(t => t.id === openTaskId)
    if (task) setSelectedTask(task)
  }, [openTaskId, tasks])

  // Auto-open task creation from ?create=<projectId|new>
  useEffect(() => {
    if (createForProjectId === null) return
    setCreating({ projectId: createForProjectId === 'new' ? null : createForProjectId })
    // Strip ?create= from URL once consumed
    const sp = new URLSearchParams(searchParams.toString())
    sp.delete('create')
    router.replace(`/tasks${sp.toString() ? `?${sp}` : ''}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForProjectId])

  const closeTaskModal = () => {
    setSelectedTask(null)
    if (openTaskId) {
      const sp = new URLSearchParams(searchParams.toString())
      sp.delete('open')
      router.replace(`/tasks${sp.toString() ? `?${sp}` : ''}`, { scroll: false })
    }
  }

  const navigateToProject = (projectId: string) => {
    router.push(`/projects?open=${projectId}`)
  }

  /** Wrap updateTask to record audit comments on every successful edit */
  const handleUpdate = async (id: string, updates: Partial<Task>) => {
    const oldTask = tasks.find(t => t.id === id)
    const result = await updateTask(id, updates)
    if (!result.error && oldTask && currentUser.assignee) {
      const changes = diffTask(oldTask, updates, projects)
      if (changes.length > 0) {
        await supabase.from('comments').insert({
          task_id: id,
          kind: 'audit',
          author: currentUser.assignee,
          text: changes.join('; '),
        })
      }
    }
    return result
  }

  /** Wrap moveTask (status-only update) — same audit treatment */
  const handleMove = async (id: string, status: Status) => {
    return handleUpdate(id, { status })
  }

  const handleCreate = async (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    await createTask(data)
    setCreating(null)
  }

  const filteredTasks = applyTaskFilters(tasks, filters, currentUser.assignee)
  const hasFilters = filters.assignee !== 'all' || filters.tags.length > 0

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Задачи</h1>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Конкретные дела с дедлайном. Объединяются в проекты.
          </p>
        </div>
        {!currentUser.loading && !currentUser.assignee && (
          <p className="mt-2 rounded-md bg-yellow-50 px-2 py-1 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
            ⚠️ Email <b>{currentUser.email}</b> не распознан. Проверь переменные окружения.
          </p>
        )}
        <div className="mt-4">
          <MobileViewTabs basePath="/tasks" subs={[
            { view: 'kanban',    label: 'Канбан',    icon: '📋' },
            { view: 'list',      label: 'Список',    icon: '📃' },
            { view: 'calendar',  label: 'Календарь', icon: '📅' },
            { view: 'analytics', label: 'Аналитика', icon: '📊' },
          ]} />
        </div>
        <TaskFilters
          filters={filters}
          currentUserAssignee={currentUser.assignee}
          onChange={setFilters}
        />
      </div>

      {/* View body */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Загрузка...</p>
          </div>
        ) : filteredTasks.length === 0 && hasFilters ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-gray-400">Ничего не найдено</p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-2 text-sm text-blue-600 underline"
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        ) : view === 'kanban' ? (
          <KanbanBoard
            tasks={filteredTasks}
            projects={projects}
            currentUser={currentUser.assignee ?? 'nick'}
            onMove={handleMove}
            onUpdate={handleUpdate}
            onDelete={deleteTask}
            onCreate={createTask}
            onProjectOpen={navigateToProject}
          />
        ) : view === 'list' ? (
          <ListView
            tasks={filteredTasks}
            projects={projects}
            onTaskOpen={setSelectedTask}
            onStatusChange={handleMove}
          />
        ) : view === 'calendar' ? (
          <CalendarView
            tasks={filteredTasks}
            projects={projects}
            onTaskOpen={setSelectedTask}
          />
        ) : (
          <AnalyticsView
            tasks={filteredTasks}
            projects={projects}
            onTaskOpen={setSelectedTask}
          />
        )}
      </div>

      <Fab label="Задача" onClick={() => setCreating({})} />

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          currentUser={currentUser.assignee ?? 'nick'}
          onUpdate={async (id, updates) => {
            const result = await handleUpdate(id, updates)
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null)
            return result
          }}
          onDelete={deleteTask}
          onClose={closeTaskModal}
          onProjectOpen={navigateToProject}
        />
      )}

      {creating && (
        <Modal onClose={() => setCreating(null)} title="Новая задача">
          <TaskForm
            initial={{ project_id: creating.projectId ?? null }}
            projects={projects}
            defaultAssignee={currentUser.assignee}
            onSubmit={handleCreate}
            onCancel={() => setCreating(null)}
            submitLabel="Создать"
          />
        </Modal>
      )}
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Загрузка...</div>}>
      <TasksPageInner />
    </Suspense>
  )
}
