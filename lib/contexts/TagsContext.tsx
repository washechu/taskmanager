'use client'

import {
  createContext, useCallback, useContext, useMemo, type ReactNode,
} from 'react'
import { useTable } from '@/lib/hooks/useTable'
import type { Tag } from '@/lib/types'

/**
 * Общий context для тегов. Раньше каждый компонент, которому нужны были
 * теги (TaskCard, TagPicker, TagChip — десятки), вызывал свой useTags(),
 * создавая отдельный realtime-канал. На странице с 30 задачами это 30+
 * подписок на одну таблицу. Привело к prod-инциденту (см. hotfix #61):
 * Supabase JS бросил «cannot add postgres_changes callbacks after
 * subscribe()» из-за коллизии имён каналов.
 *
 * Сейчас: одна подписка на всё приложение (TagsProvider), потребители
 * читают `useTags()` через контекст. Экономно по каналам, нет коллизий
 * по умолчанию.
 *
 * API совместим с прежним хуком — потребителям достаточно того же
 * импорта `import { useTags } from '@/lib/hooks/useTags'`.
 */
interface TagsContextValue {
  tags:      Tag[]
  loading:   boolean
  createTag: (name: string, color: string) => Promise<{ data?: Tag; error: unknown }>
  updateTag: (id: string, updates: Partial<Tag>) => Promise<{ error: unknown }>
  deleteTag: (id: string) => Promise<{ error: unknown }>
}

const TagsContext = createContext<TagsContextValue | null>(null)

export function TagsProvider({ children }: { children: ReactNode }) {
  const { items, loading, supabase, setItems, update, remove } =
    useTable<Tag>('tags', { orderBy: { column: 'name', ascending: true } })

  const createTag = useCallback(async (name: string, color: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { error: new Error('empty name') }
    // id заранее — чтобы realtime INSERT не задвоил оптимистичную строку.
    // Сортировка по имени → не используем общий insert; делаем напрямую
    // и переупорядочиваем стейт.
    const id = crypto.randomUUID()
    const { data, error } = await supabase
      .from('tags')
      .insert({ id, name: trimmed, color })
      .select()
      .single()
    if (data) {
      setItems(prev => {
        if (prev.some(t => t.id === id)) return prev   // realtime опередил
        return [...prev, data as Tag].sort((a, b) => a.name.localeCompare(b.name))
      })
    }
    return { data: data as Tag | undefined, error }
  }, [supabase, setItems])

  const updateTag = useCallback(
    (id: string, updates: Partial<Tag>) => update(id, updates),
    [update],
  )

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

  const value = useMemo<TagsContextValue>(() => ({
    tags: items, loading, createTag, updateTag, deleteTag,
  }), [items, loading, createTag, updateTag, deleteTag])

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>
}

export function useTagsContext(): TagsContextValue {
  const ctx = useContext(TagsContext)
  if (!ctx) {
    throw new Error('useTags() must be used inside <TagsProvider> (см. app/(app)/layout.tsx)')
  }
  return ctx
}
