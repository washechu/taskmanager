'use client'

import { useState } from 'react'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { CalendarView } from '@/components/tasks/CalendarView'
import { ListView } from '@/components/tasks/ListView'
import { GanttView } from '@/components/tasks/GanttView'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskFilters, applyTaskFilters, type TaskFilterState } from '@/components/tasks/TaskFilters'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import type { Task } from '@/lib/types'

const DEFAULT_FILTERS: TaskFilterState = {
  category: 'all',
  projectId: 'all',
  assignee: 'all',
  priority: 'all',
  tags: [],
}

type View = 'kanban' | 'list' | 'calendar' | 'gantt'

const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: 'kanban',   label: 'Канбан',    icon: '🗂️' },
  { id: 'list',     label: 'Список',    icon: '📋' },
  { id: 'calendar', label: 'Календарь', icon: '📅' },
  { id: 'gantt',    label: 'Гант',      icon: '📊' },
]

export default function TasksPage() {
  const { tasks, loading, createTask, updateTask, deleteTask, moveTask } = useTasks()
  const { projects } = useProjects()
  const currentUser = useCurrentUser()
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_FILTERS)
  const [view, setView] = useState<View>('kanban')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const filteredTasks = applyTaskFilters(tasks, filters)
  const hasFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== 'all')

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Задачи</h1>
            {/* View switcher */}
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
        ) : view === 'calendar' ? (
          <CalendarView
            tasks={filteredTasks}
            projects={projects}
            onTaskOpen={setSelectedTask}
          />
        ) : (
          <GanttView
            tasks={filteredTasks}
            projects={projects}
            onTaskOpen={setSelectedTask}
          />
        )}
      </div>

      {/* Shared task modal for non-Kanban views */}
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
