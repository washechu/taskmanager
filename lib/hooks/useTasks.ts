'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Status } from '@/lib/types'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTasks()

    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTasks, supabase])

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) => {
    const optimisticTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Если задача создаётся со статусом 'done', DB-триггер выставит completed_at;
      // оптимистично угадываем то же значение, иначе null.
      completed_at: task.status === 'done' ? new Date().toISOString() : null,
    }
    setTasks(prev => [optimisticTask, ...prev])

    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    if (error) {
      setTasks(prev => prev.filter(t => t.id !== optimisticTask.id))
    } else {
      setTasks(prev => prev.map(t => t.id === optimisticTask.id ? data : t))
    }
    return { data, error }
  }, [supabase])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) fetchTasks()
    return { error }
  }, [supabase, fetchTasks])

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) fetchTasks()
    return { error }
  }, [supabase, fetchTasks])

  const moveTask = useCallback(async (id: string, status: Status) => {
    return updateTask(id, { status })
  }, [updateTask])

  return { tasks, loading, createTask, updateTask, deleteTask, moveTask }
}
