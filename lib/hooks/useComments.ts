'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Comment, Assignee } from '@/lib/types'

export function useComments(taskId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    if (data) setComments(data as Comment[])
    setLoading(false)
  }, [supabase, taskId])

  useEffect(() => {
    fetchComments()

    const channel = supabase
      .channel(`comments-${taskId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `task_id=eq.${taskId}`,
      }, () => {
        fetchComments()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchComments, supabase, taskId])

  const addComment = useCallback(async (text: string, author: Assignee) => {
    const optimistic: Comment = {
      id: crypto.randomUUID(),
      task_id: taskId,
      author,
      text,
      kind: 'user',
      created_at: new Date().toISOString(),
    }
    setComments(prev => [...prev, optimistic])

    const { data, error } = await supabase
      .from('comments')
      .insert({ task_id: taskId, author, text, kind: 'user' })
      .select()
      .single()

    if (error) {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
    } else if (data) {
      setComments(prev => prev.map(c => c.id === optimistic.id ? (data as Comment) : c))
    }
    return { error }
  }, [supabase, taskId])

  const deleteComment = useCallback(async (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id))
    const { error } = await supabase.from('comments').delete().eq('id', id)
    if (error) fetchComments()
    return { error }
  }, [supabase, fetchComments])

  return { comments, loading, addComment, deleteComment }
}
