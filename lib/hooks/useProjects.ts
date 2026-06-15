'use client'

import { useCallback } from 'react'
import { useTable } from './useTable'
import type { Project } from '@/lib/types'

type NewProject = Omit<Project, 'id' | 'created_at' | 'updated_at'>

export function useProjects() {
  const { items, loading, insert, update, remove } =
    useTable<Project>('projects', { orderBy: { column: 'created_at', ascending: false } })

  const createProject = useCallback(async (project: NewProject) => {
    const now = new Date().toISOString()
    const optimistic: Project = {
      ...project,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    return insert(project as unknown as Record<string, unknown>, optimistic)
  }, [insert])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    return update(id, { ...updates, updated_at: new Date().toISOString() })
  }, [update])

  const deleteProject = useCallback((id: string) => remove(id), [remove])

  return { projects: items, loading, createProject, updateProject, deleteProject }
}
