'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tag } from '@/lib/types'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  // Memoize the client so the effect doesn't re-subscribe on every render
  const supabase = useMemo(() => createClient(), [])

  const fetchTags = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('tags').select('*').order('name')
      if (error) {
        // Table might not exist yet (migration 003 not run) — fail silently
        console.warn('[useTags] fetch failed:', error.message)
      } else if (data) {
        setTags(data as Tag[])
      }
    } catch (err) {
      console.warn('[useTags] unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchTags()
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel('tags-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => {
          fetchTags()
        })
        .subscribe()
    } catch (err) {
      console.warn('[useTags] subscription failed:', err)
    }
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchTags, supabase])

  const createTag = useCallback(async (name: string, color: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { error: new Error('empty name') }
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: trimmed, color })
      .select()
      .single()
    if (data) setTags(prev => [...prev, data as Tag].sort((a, b) => a.name.localeCompare(b.name)))
    return { data, error }
  }, [supabase])

  const updateTag = useCallback(async (id: string, updates: Partial<Tag>) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error } = await supabase.from('tags').update(updates).eq('id', id)
    if (error) fetchTags()
    return { error }
  }, [supabase, fetchTags])

  const deleteTag = useCallback(async (id: string) => {
    const tag = tags.find(t => t.id === id)
    setTags(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) {
      fetchTags()
      return { error }
    }
    // Strip the (now-deleted) tag name from any tasks still referencing it,
    // so we don't leave orphan names rendering as gray chips.
    if (tag) {
      const { data: affected } = await supabase
        .from('tasks')
        .select('id, tags')
        .contains('tags', [tag.name])
      if (affected?.length) {
        await Promise.all(
          affected.map(t =>
            supabase
              .from('tasks')
              .update({ tags: (t.tags as string[]).filter(name => name !== tag.name) })
              .eq('id', t.id)
          )
        )
      }
    }
    return { error }
  }, [supabase, fetchTags, tags])

  return { tags, loading, createTag, updateTag, deleteTag }
}
