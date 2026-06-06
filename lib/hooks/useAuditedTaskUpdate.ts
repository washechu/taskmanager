'use client'

import { useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { diffTask } from '@/lib/diffTask'
import type { Task, Project, Assignee } from '@/lib/types'

/**
 * Возвращает обёртку над `updateTask`, которая после успешного апдейта
 * добавляет audit-комментарий с человекочитаемой разницей (через
 * `diffTask`). Используется и на `/tasks`, и на `/today` (где задачи
 * могут меняться через чекбокс или модалку).
 *
 * Сохраняет тот же возвращаемый тип, что и `updateTask`.
 */
export function useAuditedTaskUpdate(
  tasks: Task[],
  updateTask: (id: string, updates: Partial<Task>) => Promise<{ error: unknown }>,
  projects: Project[],
  currentUserAssignee: Assignee | null | undefined,
) {
  const supabase = useMemo(() => createClient(), [])

  return useCallback(async (id: string, updates: Partial<Task>) => {
    const oldTask = tasks.find(t => t.id === id)
    const result = await updateTask(id, updates)
    if (!result.error && oldTask && currentUserAssignee) {
      const changes = diffTask(oldTask, updates, projects, currentUserAssignee)
      if (changes.length > 0) {
        await supabase.from('comments').insert({
          task_id: id,
          kind: 'audit',
          author: currentUserAssignee,
          text: changes.join('; '),
        })
      }
    }
    return result
  }, [tasks, updateTask, projects, currentUserAssignee, supabase])
}
