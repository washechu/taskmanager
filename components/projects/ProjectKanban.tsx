'use client'

import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ProjectCard } from './ProjectCard'
import { ProjectModal } from './ProjectModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { STATUSES, STATUS_ORDER, type Status, type Project } from '@/lib/types'
import type { Task } from '@/lib/types'

const headerColors: Record<Status, string> = {
  todo:        'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
  in_progress: 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
  done:        'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
  paused:      'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30',
}

function ProjectColumn({
  status, projects, tasks, onOpen, onAdd,
}: {
  status: Status
  projects: Project[]
  tasks: Task[]
  onOpen: (p: Project) => void
  onAdd: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-950/50">
      <div className={`flex items-center justify-between rounded-t-xl border-b px-3 py-2.5 ${headerColors[status]}`}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{STATUSES[status].label}</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-xs font-medium text-gray-500 dark:bg-gray-900/80">
            {projects.length}
          </span>
        </div>
        <button onClick={onAdd} className="rounded-md p-1 text-gray-400 hover:bg-white/60 hover:text-gray-600">+</button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 p-2 transition-colors ${isOver ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
        style={{ minHeight: 120 }}
      >
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} tasks={tasks} onOpen={onOpen} />
          ))}
        </SortableContext>
        {projects.length === 0 && (
          <EmptyState text="Проектов пока нет" actionLabel="+ Создать проект" onAction={onAdd} />
        )}
      </div>
    </div>
  )
}

interface ProjectKanbanProps {
  projects: Project[]
  tasks: Task[]
  onMove: (id: string, status: Status) => Promise<{ error: unknown }>
  onUpdate: (id: string, updates: Partial<Project>) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onCreate: () => void
}

export function ProjectKanban({ projects, tasks, onMove, onUpdate, onDelete, onCreate }: ProjectKanbanProps) {
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveProject(projects.find(p => p.id === active.id) ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveProject(null)
    if (!over) return
    const project = projects.find(p => p.id === active.id)
    if (!project) return
    const targetStatus = STATUS_ORDER.includes(over.id as Status)
      ? (over.id as Status)
      : projects.find(p => p.id === over.id)?.status
    if (targetStatus && targetStatus !== project.status) {
      onMove(project.id, targetStatus)
    }
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUS_ORDER.map(status => (
            <ProjectColumn
              key={status}
              status={status}
              projects={projects.filter(p => p.status === status)}
              tasks={tasks}
              onOpen={setSelectedProject}
              onAdd={onCreate}
            />
          ))}
        </div>
        <DragOverlay>
          {activeProject && (
            <div className="rotate-2 opacity-90">
              <ProjectCard project={activeProject} tasks={tasks} onOpen={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          tasks={tasks}
          onUpdate={async (id, updates) => {
            const result = await onUpdate(id, updates)
            setSelectedProject(prev => prev ? { ...prev, ...updates } : null)
            return result
          }}
          onDelete={onDelete}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </>
  )
}
