'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { CalendarView } from '@/components/tasks/CalendarView'
import { ListView } from '@/components/tasks/ListView'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskFilters, applyTaskFilters, type TaskFilterState } from '@/components/tasks/TaskFilters'
import { MobileViewTabs } from '@/components/ui/Navigation'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import type { Task } from '@/lib/types'

const DEFAULT_FILTERS: TaskFilterState = {
  category: 'all',
  projectId: 'all',
  assignee: 'all',
  tags: [],
  sort: 'created',
}

function TasksPageInner() {
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') ?? 'kanban') as 'kanban' | 'list' | 'calendar'

  const { tasks, loading, createTask, updateTask, deleteTask, moveTask } = useTasks()
  const { projects } = useProjects()
  const currentUser = useCurrentUser()
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_FILTERS)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const filteredTasks = applyTaskFilters(tasks, filters)
  const hasFilters = filters.category !== 'all' || filters.projectId !== 'all' ||
    filters.assignee !== 'all' || filters.tags.length > 0

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Планировщик</h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Конкретные дела с дедлайном. Объединяются в проекты.
            </p>
          </div>
          {currentUser.assignee && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {currentUser.assignee === 'nick' ? 'Никита' : 'Галочка'}
            </span>
          )}
        </div>
        {!currentUser.loading && !currentUser.assignee && (
          <p className="mt-2 rounded-md bg-yellow-50 px-2 py-1 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
            ⚠️ Email <b>{currentUser.email}</b> не распознан. Проверь переменные окружения.
          </p>
        )}
        <div className="mt-2">
          <MobileViewTabs basePath="/tasks" subs={[
            { view: 'kanban',   label: 'Канбан'    },
            { view: 'list',     label: 'Список'    },
            { view: 'calendar', label: 'Календарь' },
          ]} />
        </div>
        <TaskFilters filters={filters} projects={projects} onChange={setFilters} />
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
              <p className="text-sm text-gray-500">Ничего не найдено</p>
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
            onMove={moveTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onCreate={createTask}
          />
        ) : view === 'list' ? (
          <ListView
            tasks={filteredTasks}
            projects={projects}
            onTaskOpen={setSelectedTask}
            onStatusChange={moveTask}
          />
        ) : (
          <CalendarView
            tasks={filteredTasks}
            projects={projects}
            onTaskOpen={setSelectedTask}
          />
        )}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          currentUser={currentUser.assignee ?? 'nick'}
          onUpdate={async (id, updates) => {
            const result = await updateTask(id, updates)
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null)
            return result
          }}
          onDelete={deleteTask}
          onClose={() => setSelectedTask(null)}
        />
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
