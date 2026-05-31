'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/lib/types'

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchProjects()

    const channel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        fetchProjects()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchProjects, supabase])

  const createProject = useCallback(async (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const optimistic: Project = {
      ...project,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setProjects(prev => [optimistic, ...prev])

    const { data, error } = await supabase.from('projects').insert(project).select().single()
    if (error) {
      setProjects(prev => prev.filter(p => p.id !== optimistic.id))
    } else {
      setProjects(prev => prev.map(p => p.id === optimistic.id ? data : p))
    }
    return { data, error }
  }, [supabase])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    const { error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) fetchProjects()
    return { error }
  }, [supabase, fetchProjects])

  const deleteProject = useCallback(async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) fetchProjects()
    return { error }
  }, [supabase, fetchProjects])

  return { projects, loading, createProject, updateProject, deleteProject }
}
