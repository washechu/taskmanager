'use client'

import { useState } from 'react'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { TaskFilters, applyTaskFilters, type TaskFilterState } from '@/components/tasks/TaskFilters'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'

const DEFAULT_FILTERS: TaskFilterState = {
  category: 'all',
  projectId: 'all',
  assignee: 'all',
  priority: 'all',
  tags: [],
}

export default function TasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask, moveTask } = useTasks()
  const { projects } = useProjects()
  const currentUser = useCurrentUser()
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_FILTERS)

  const filteredTasks = applyTaskFilters(tasks, filters)
  const hasFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== 'all')

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Задачи</h1>
          <div className="flex items-center gap-3">
            {currentUser.assignee && (
              <span className="text-xs text-gray-400">
                {currentUser.assignee === 'nick' ? 'Ник' : 'Галя'}
              </span>
            )}
            <span className="text-sm text-gray-400">{filteredTasks.length} задач</span>
          </div>
        </div>
        {!currentUser.loading && !currentUser.assignee && (
          <p className="mt-1 rounded-md bg-yellow-50 px-2 py-1 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
            ⚠️ Email <b>{currentUser.email}</b> не распознан как Ник или Галя. Проверь переменные окружения.
          </p>
        )}
        <TaskFilters filters={filters} projects={projects} onChange={setFilters} />
      </div>

      {/* Kanban */}
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
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            projects={projects}
            currentUser={currentUser.assignee ?? 'nick'}
            onMove={moveTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onCreate={createTask}
          />
        )}
      </div>
    </div>
  )
}
