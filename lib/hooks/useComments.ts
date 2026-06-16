'use client'

import { useCallback } from 'react'
import { useTable } from './useTable'
import type { Comment, Assignee } from '@/lib/types'

export function useComments(taskId: string) {
  const { items, loading, insert, remove } = useTable<Comment>('comments', {
    filter:  { column: 'task_id', value: taskId },
    orderBy: { column: 'created_at', ascending: true },
    channel: `comments-${taskId}`,
    // ASC порядок → новые строки в конец списка.
    defaultInsertPosition: 'end',
  })

  const addComment = useCallback(async (text: string, author: Assignee) => {
    const optimistic: Comment = {
      id: crypto.randomUUID(),
      task_id: taskId,
      author,
      text,
      kind: 'user',
      created_at: new Date().toISOString(),
    }
    const { error } = await insert(
      { task_id: taskId, author, text, kind: 'user' },
      optimistic,
    )
    return { error }
  }, [insert, taskId])

  const deleteComment = useCallback((id: string) => remove(id), [remove])

  return { comments: items, loading, addComment, deleteComment }
}
