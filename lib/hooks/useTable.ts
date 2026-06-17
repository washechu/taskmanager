'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState,
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

  // ВАЖНО: options обычно приходит как inline object literal из вызывающего
  // хука (`useTable<Task>('tasks', { orderBy: {...} })`). Без аккуратной
  // мемоизации deps пересоздаются каждый рендер → useEffect ниже постоянно
  // переподписывается → реалтайм-события теряются в окне unsub/sub, а
  // fetchAll выполняется в гонке с оптимистичными правками. Поэтому
  // разворачиваем options в ПРИМИТИВЫ — они стабильны между рендерами.
  const filterColumn = options.filter?.column
  const filterValue  = options.filter?.value
  const orderByColumn = options.orderBy?.column
  const orderByAsc    = options.orderBy?.ascending ?? true
  const channelOpt    = options.channel
  const defaultInsertPosition = options.defaultInsertPosition ?? 'start'

  const fetchAll = useCallback(async () => {
    let q = supabase.from(table).select('*')
    if (filterColumn && filterValue) q = q.eq(filterColumn, filterValue)
    if (orderByColumn) q = q.order(orderByColumn, { ascending: orderByAsc })
    const { data } = await q
    if (data) setItems(data as T[])
    setLoading(false)
  }, [supabase, table, filterColumn, filterValue, orderByColumn, orderByAsc])

  // Имя канала стабильное per-mount (через useRef). Random suffix защищает
  // от коллизий, если на странице вдруг окажется два инстанса хука с одним
  // именем канала (см. историю с useTags до TagsProvider).
  const channelNameRef = useRef<string | null>(null)
  if (channelNameRef.current === null) {
    channelNameRef.current = (channelOpt ?? `${table}-changes`) + `-${Math.random().toString(36).slice(2, 10)}`
  }

  useEffect(() => {
    fetchAll()

    let ch: ReturnType<typeof supabase.channel> | null = null
    try {
      ch = supabase
        .channel(channelNameRef.current!)
        .on(
          'postgres_changes',
          {
            event: '*', schema: 'public', table,
            ...(filterColumn && filterValue ? { filter: `${filterColumn}=eq.${filterValue}` } : {}),
          },
          (payload) => {
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
    // ВАЖНО: deps — только примитивы. fetchAll осознанно убран — это
    // ре-создаваемый callback, его реакт-deps уже учтены через примитивы
    // ниже (filterColumn/filterValue/orderBy*). Иначе useEffect будет
    // ре-подписываться каждый рендер и реалтайм будет терять события.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, table, filterColumn, filterValue, defaultInsertPosition])

  const insert = useCallback<UseTableResult<T>['insert']>(async (payload, optimistic, place) => {
    const pos = place ?? defaultInsertPosition
    setItems(prev => (pos === 'end' ? [...prev, optimistic] : [optimistic, ...prev]))
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
