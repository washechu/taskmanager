'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tag } from '@/lib/types'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('tags').select('*').order('name')
    if (data) setTags(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchTags()
    const channel = supabase
      .channel('tags-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => {
        fetchTags()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchTags, supabase])

  const createTag = useCallback(async (name: string, color: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { error: new Error('empty name') }
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: trimmed, color })
      .select()
      .single()
    if (data) setTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }, [supabase])

  const updateTag = useCallback(async (id: string, updates: Partial<Tag>) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error } = await supabase.from('tags').update(updates).eq('id', id)
    if (error) fetchTags()
    return { error }
  }, [supabase, fetchTags])

  const deleteTag = useCallback(async (id: string) => {
    setTags(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) fetchTags()
    return { error }
  }, [supabase, fetchTags])

  return { tags, loading, createTag, updateTag, deleteTag }
}
