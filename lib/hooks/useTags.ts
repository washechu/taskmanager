'use client'

import { useCallback } from 'react'
import { useTable } from './useTable'
import type { Tag } from '@/lib/types'

export function useTags() {
  const { items, loading, supabase, setItems, fetchAll, update, remove } =
    useTable<Tag>('tags', { orderBy: { column: 'name', ascending: true } })

  const createTag = useCallback(async (name: string, color: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { error: new Error('empty name') }
    // Сортировка по имени → не используем insert общего хука (он добавляет
    // в начало/конец). Делаем напрямую и переупорядочиваем стейт.
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: trimmed, color })
      .select()
      .single()
    if (data) {
      setItems(prev => [...prev, data as Tag].sort((a, b) => a.name.localeCompare(b.name)))
    }
    return { data, error }
  }, [supabase, setItems])

  const updateTag = useCallback(async (id: string, updates: Partial<Tag>) => {
    return update(id, updates)
  }, [update])

  const deleteTag = useCallback(async (id: string) => {
    const tag = items.find(t => t.id === id)
    const { error } = await remove(id)
    if (error) return { error }
    // После удаления тега вычищаем его имя из tasks.tags[], чтобы не
    // оставались «осиротевшие» имена, рендерящиеся серым.
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
              .eq('id', t.id),
          ),
        )
      }
    }
    return { error: null }
  }, [items, supabase, remove])

  // fetchAll нужен для backward-compat (если кто-то его вызывал).
  void fetchAll

  return { tags: items, loading, createTag, updateTag, deleteTag }
}
