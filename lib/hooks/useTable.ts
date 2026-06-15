'use client'

import {
  useCallback, useEffect, useMemo, useState,
  type Dispatch, type SetStateAction,
} from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * Общий паттерн «строки таблицы + realtime + оптимистичный CRUD» вынесен
 * сюда из useTasks/useProjects/useTags/useComments. Каждый специфичный
 * хук строится поверх как тонкая обёртка: задаёт имя таблицы, опции
 * (фильтр, сортировка), и оборачивает базовые операции своей бизнес-логикой
 * (например, useTasks подкладывает `completed_at` если статус сразу `done`).
 *
 * Сейчас полный re-fetch на каждое realtime-событие — это упрощает код
 * и не больно на текущих масштабах. Payload-based incremental update —
 * отдельный шаг (см. техдолг, P1).
 */

export interface UseTableOptions {
  /** WHERE для select и filter для realtime. Имеет смысл, например, для
   *  `comments` (фильтр по task_id). */
  filter?: { column: string; value: string }
  /** ORDER BY для select. */
  orderBy?: { column: string; ascending?: boolean }
  /** Имя канала Supabase. По умолчанию `${table}-changes`. */
  channel?: string
}

export interface UseTableResult<T extends { id: string }> {
  items: T[]
  loading: boolean
  /** Supabase-клиент — для специфических операций (deleteTag вычищает
   *  ссылки в tasks.tags, например). */
  supabase: SupabaseClient
  /** Прямой доступ к стейту для редких кейсов (toggleLog в useHabits). */
  setItems: Dispatch<SetStateAction<T[]>>
  /** Перевыборка всех строк. */
  fetchAll: () => Promise<void>

  /**
   * Оптимистичный insert. Вызывающий передаёт payload (без id) и
   * optimistic-объект (с заглушкой id/created_at/updated_at).
   * После успешного insert заменяем optimistic на возвращённую из БД строку.
   *
   * `place`: 'start' (default) для DESC-сортировок, 'end' для ASC.
   */
  insert: (
    payload: Record<string, unknown>,
    optimistic: T,
    place?: 'start' | 'end',
  ) => Promise<{ data: T | null; error: unknown }>

  /**
   * Оптимистичный update. Обновляет items{ ...patch }; на ошибке — fetchAll.
   * Подкладывание updated_at — ответственность вызывающего (не все таблицы
   * его имеют — comments/tags/habit_logs без).
   */
  update: (
    id: string,
    patch: Record<string, unknown>,
  ) => Promise<{ error: unknown }>

  /** Оптимистичный delete. На ошибке — fetchAll. */
  remove: (id: string) => Promise<{ error: unknown }>
}

export function useTable<T extends { id: string }>(
  table: string,
  options: UseTableOptions = {},
): UseTableResult<T> {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const { filter, orderBy, channel } = options

  const fetchAll = useCallback(async () => {
    let q = supabase.from(table).select('*')
    if (filter)  q = q.eq(filter.column, filter.value)
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true })
    const { data } = await q
    if (data) setItems(data as T[])
    setLoading(false)
  }, [supabase, table, filter, orderBy])

  useEffect(() => {
    fetchAll()

    const ch = supabase
      .channel(channel ?? `${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*', schema: 'public', table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        () => { fetchAll() },
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [supabase, table, channel, filter, fetchAll])

  const insert = useCallback<UseTableResult<T>['insert']>(async (payload, optimistic, place = 'start') => {
    setItems(prev => (place === 'end' ? [...prev, optimistic] : [optimistic, ...prev]))
    const { data, error } = await supabase.from(table).insert(payload).select().single()
    if (error) {
      setItems(prev => prev.filter(t => t.id !== optimistic.id))
      return { data: null, error }
    }
    setItems(prev => prev.map(t => (t.id === optimistic.id ? (data as T) : t)))
    return { data: data as T, error: null }
  }, [supabase, table])

  const update = useCallback<UseTableResult<T>['update']>(async (id, patch) => {
    setItems(prev => prev.map(t => (t.id === id ? ({ ...t, ...patch } as T) : t)))
    const { error } = await supabase.from(table).update(patch).eq('id', id)
    if (error) fetchAll()
    return { error }
  }, [supabase, table, fetchAll])

  const remove = useCallback<UseTableResult<T>['remove']>(async (id) => {
    setItems(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) fetchAll()
    return { error }
  }, [supabase, table, fetchAll])

  return { items, loading, supabase, setItems, fetchAll, insert, update, remove }
}
