'use client'

import {
  useCallback, useEffect, useMemo, useState,
  type Dispatch, type SetStateAction,
} from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * Общий паттерн «строки таблицы + realtime + оптимистичный CRUD».
 * Каждый специфичный хук (useTasks/useProjects/useTags/useComments)
 * строится поверх как тонкая обёртка: задаёт имя таблицы, опции и
 * оборачивает базовые операции своей бизнес-логикой.
 *
 * Realtime: payload-based incremental update. Раньше был full re-fetch
 * на каждое событие → 1 правка задачи = SELECT * FROM tasks. Стало:
 *   INSERT → добавить (dedup по id)
 *   UPDATE → patch строки по id
 *   DELETE → отфильтровать по id
 *
 * Защита от рассинхронизации с оптимистичным insert: мы передаём id
 * в payload, поэтому DB-row имеет тот же id, что и optimistic. Когда
 * realtime прилетит — dedup сработает по id.
 */

export interface UseTableOptions {
  /** WHERE для select и filter для realtime. */
  filter?: { column: string; value: string }
  /** ORDER BY для select. */
  orderBy?: { column: string; ascending?: boolean }
  /** Имя канала Supabase. По умолчанию `${table}-changes`. */
  channel?: string
  /** Куда вставлять новые строки в стейт (для оптимистичного insert
   *  и realtime INSERT, если строки ещё нет). По умолчанию 'start'
   *  (соответствует DESC orderBy у большинства таблиц). */
  defaultInsertPosition?: 'start' | 'end'
}

export interface UseTableResult<T extends { id: string }> {
  items: T[]
  loading: boolean
  /** Supabase-клиент — для специфических операций (deleteTag вычищает
   *  ссылки в tasks.tags, например). */
  supabase: SupabaseClient
  /** Прямой доступ к стейту для редких кейсов (toggleLog в useHabits). */
  setItems: Dispatch<SetStateAction<T[]>>
  /** Перевыборка всех строк — используется как fallback на ошибках. */
  fetchAll: () => Promise<void>

  /**
   * Оптимистичный insert. Вызывающий передаёт payload (без id) и
   * optimistic-объект (с заглушкой). Хук подмешивает `optimistic.id`
   * в payload — DB сохранит row с тем же id, что в стейте, и
   * realtime-событие будет дедуплицировано.
   *
   * `place`: 'start' | 'end' — куда вставить оптимистично. По умолчанию
   *   options.defaultInsertPosition ?? 'start'.
   */
  insert: (
    payload: Record<string, unknown>,
    optimistic: T,
    place?: 'start' | 'end',
  ) => Promise<{ data: T | null; error: unknown }>

  /**
   * Оптимистичный update. Обновляет items{ ...patch }; на ошибке —
   * fetchAll. Подкладывание updated_at — ответственность вызывающего
   * (не все таблицы его имеют).
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

  const { filter, orderBy, channel, defaultInsertPosition = 'start' } = options

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

    // Имя канала должно быть УНИКАЛЬНЫМ per-hook-instance: некоторые хуки
    // (useTags) вызываются десятками раз на одной странице (в TaskCard,
    // TagPicker, TagChip). Если два инстанса откроют канал с одним именем
    // и оба попытаются добавить listener после subscribe() — Supabase JS
    // бросает «cannot add postgres_changes callbacks after subscribe()».
    const channelName = (channel ?? `${table}-changes`) + `-${Math.random().toString(36).slice(2, 10)}`

    let ch: ReturnType<typeof supabase.channel> | null = null
    try {
      ch = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', schema: 'public', table,
            ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
          },
          (payload) => {
            // Payload-based incremental update. Типы Supabase отдают new/old
            // как Record<string, unknown> — кастуем к T (контракт хука).
            if (payload.eventType === 'INSERT') {
              const row = payload.new as T
              setItems(prev => {
                if (prev.some(t => t.id === row.id)) return prev   // dedup
                return defaultInsertPosition === 'end' ? [...prev, row] : [row, ...prev]
              })
            } else if (payload.eventType === 'UPDATE') {
              const row = payload.new as T
              setItems(prev => prev.map(t => (t.id === row.id ? row : t)))
            } else if (payload.eventType === 'DELETE') {
              const row = payload.old as Partial<T>
              if (row.id) {
                setItems(prev => prev.filter(t => t.id !== row.id))
              }
            }
          },
        )
        .subscribe()
    } catch (err) {
      console.warn(`[useTable:${table}] subscription failed:`, err)
    }

    return () => { if (ch) supabase.removeChannel(ch) }
  }, [supabase, table, channel, filter, fetchAll, defaultInsertPosition])

  const insert = useCallback<UseTableResult<T>['insert']>(async (payload, optimistic, place) => {
    const pos = place ?? defaultInsertPosition
    setItems(prev => (pos === 'end' ? [...prev, optimistic] : [optimistic, ...prev]))
    // id из optimistic в payload — гарантия, что DB-row совпадёт по id.
    // Это снимает рассинхрон, если realtime прилетит раньше ответа DB.
    const { data, error } = await supabase
      .from(table)
      .insert({ ...payload, id: optimistic.id })
      .select()
      .single()
    if (error) {
      setItems(prev => prev.filter(t => t.id !== optimistic.id))
      return { data: null, error }
    }
    setItems(prev => prev.map(t => (t.id === optimistic.id ? (data as T) : t)))
    return { data: data as T, error: null }
  }, [supabase, table, defaultInsertPosition])

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
