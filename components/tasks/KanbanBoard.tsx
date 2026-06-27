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
import { Modal } from '@/components/ui/Modal'
import { KANBAN_STATUSES, type Task, type Status, type KanbanStatus, type Assignee } from '@/lib/types'
import type { Project } from '@/lib/types'

interface KanbanBoardProps {
  tasks: Task[]
  projects: Project[]
  currentUser: Assignee
  onMove: (id: string, status: Status) => Promise<{ error: unknown }>
  onUpdate: (id: string, updates: Partial<Task>) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onCreate: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) => Promise<{ data: Task | null; error: unknown }>
  onProjectOpen?: (projectId: string) => void
}

type PrioritySort = 'none' | 'desc' | 'asc'

// Сорты per-column храним только для тех колонок, что реально на доске
// (см. KANBAN_STATUSES в lib/types). cancelled колонки нет — sort не нужен.
const DEFAULT_SORTS: Record<KanbanStatus, PrioritySort> = {
  todo: 'none', in_progress: 'none', done: 'none', paused: 'none',
}

export function KanbanBoard({
  tasks, projects, currentUser, onMove, onUpdate, onDelete, onCreate, onProjectOpen,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [creatingStatus, setCreatingStatus] = useState<Status | null>(null)
  const [prioritySorts, setPrioritySorts] = useState<Record<KanbanStatus, PrioritySort>>(DEFAULT_SORTS)

  const cyclePrioritySort = (status: KanbanStatus) => {
    setPrioritySorts(cur => ({
      ...cur,
      [status]: cur[status] === 'none' ? 'desc' : cur[status] === 'desc' ? 'asc' : 'none',
    }))
  }

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

    // Цель дропа — либо колонка (KANBAN_STATUSES), либо другая задача в той
    // же колонке. cancelled-задачу через DnD не получить — её колонки нет.
    const targetStatus = (KANBAN_STATUSES as readonly string[]).includes(over.id as string)
      ? (over.id as Status)
      : tasks.find(t => t.id === over.id)?.status

    if (targetStatus && targetStatus !== task.status) {
      onMove(task.id, targetStatus)
    }
  }

  const handleCreate = async (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) => {
    await onCreate(data)
    setCreatingStatus(null)
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
          {KANBAN_STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks.filter(t => t.status === status)}
              projects={projects}
              prioritySort={prioritySorts[status]}
              onTogglePrioritySort={() => cyclePrioritySort(status)}
              onTaskOpen={task => setSelectedTask(task)}
              onProjectOpen={(id) => onProjectOpen?.(id)}
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
          onProjectOpen={onProjectOpen}
        />
      )}

      {/* Create task sheet */}
      {creatingStatus && (
        <Modal onClose={() => setCreatingStatus(null)} title="Новая задача">
          <TaskForm
            initial={{ status: creatingStatus }}
            projects={projects}
            defaultAssignee={currentUser}
            onSubmit={handleCreate}
            onCancel={() => setCreatingStatus(null)}
            submitLabel="Создать"
          />
        </Modal>
      )}
    </>
  )
}
