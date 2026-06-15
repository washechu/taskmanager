'use client'

import { useCallback } from 'react'
import { useTable } from './useTable'
import type { Task, Status } from '@/lib/types'

type NewTask = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>

export function useTasks() {
  const { items, loading, fetchAll, insert, update, remove } =
    useTable<Task>('tasks', { orderBy: { column: 'created_at', ascending: false } })

  const createTask = useCallback(async (task: NewTask) => {
    const now = new Date().toISOString()
    const optimistic: Task = {
      ...task,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      // DB-триггер выставит completed_at при создании со статусом 'done';
      // оптимистично угадываем, иначе null.
      completed_at: task.status === 'done' ? now : null,
    }
    return insert(task as unknown as Record<string, unknown>, optimistic)
  }, [insert])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    return update(id, { ...updates, updated_at: new Date().toISOString() })
  }, [update])

  const deleteTask = useCallback((id: string) => remove(id), [remove])
  const moveTask = useCallback((id: string, status: Status) => updateTask(id, { status }), [updateTask])

  return { tasks: items, loading, fetchAll, createTask, updateTask, deleteTask, moveTask }
}
