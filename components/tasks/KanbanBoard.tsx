'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { TaskModal } from './TaskModal'
import { TaskForm } from './TaskForm'
import { STATUS_ORDER, type Task, type Status, type Assignee } from '@/lib/types'
import type { Project } from '@/lib/types'

interface KanbanBoardProps {
  tasks: Task[]
  projects: Project[]
  currentUser: Assignee
  onMove: (id: string, status: Status) => Promise<{ error: unknown }>
  onUpdate: (id: string, updates: Partial<Task>) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onCreate: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<{ data: Task | null; error: unknown }>
}

export function KanbanBoard({ tasks, projects, currentUser, onMove, onUpdate, onDelete, onCreate }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [creatingStatus, setCreatingStatus] = useState<Status | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find(t => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (!task) return

    const targetStatus = STATUS_ORDER.includes(over.id as Status)
      ? (over.id as Status)
      : tasks.find(t => t.id === over.id)?.status

    if (targetStatus && targetStatus !== task.status) {
      onMove(task.id, targetStatus)
    }
  }

  const handleCreate = async (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    await onCreate(data)
    setCreatingStatus(null)
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUS_ORDER.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks.filter(t => t.status === status)}
              projects={projects}
              onTaskOpen={task => setSelectedTask(task)}
              onStatusChange={(id, s) => onMove(id, s)}
              onAddTask={s => setCreatingStatus(s)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-2 opacity-90">
              <TaskCard
                task={activeTask}
                projects={projects}
                onOpen={() => {}}
                onStatusChange={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          currentUser={currentUser}
          onUpdate={async (id, updates) => {
            const result = await onUpdate(id, updates)
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null)
            return result
          }}
          onDelete={onDelete}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Create task sheet */}
      {creatingStatus && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={e => e.target === e.currentTarget && setCreatingStatus(null)}
        >
          <div className="w-full max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:max-w-lg sm:rounded-2xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Новая задача
            </h2>
            <TaskForm
              initial={{ status: creatingStatus }}
              projects={projects}
              onSubmit={handleCreate}
              onCancel={() => setCreatingStatus(null)}
              submitLabel="Создать"
            />
          </div>
        </div>
      )}
    </>
  )
}
