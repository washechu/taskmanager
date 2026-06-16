'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Habit, HabitLog } from '@/lib/types'

/**
 * Двойной хук — habits + habit_logs в одной realtime-подписке (один канал
 * на оба postgres_changes-листенера). Не использует useTable<T>, потому что
 * двойная таблица не вписывается без усложнения, но повторяет тот же
 * payload-based incremental update.
 */
export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const fetchAll = useCallback(async () => {
    try {
      const [{ data: h, error: he }, { data: l, error: le }] = await Promise.all([
        supabase.from('habits').select('*').eq('archived', false).order('created_at'),
        supabase.from('habit_logs').select('*'),
      ])
      if (he) console.warn('[useHabits] habits fetch failed:', he.message)
      else if (h) setHabits(h as Habit[])
      if (le) console.warn('[useHabits] logs fetch failed:', le.message)
      else if (l) setLogs(l as HabitLog[])
    } catch (err) {
      console.warn('[useHabits] unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchAll()
    let channel: ReturnType<typeof supabase.channel> | null = null
    // Уникальное имя канала per-hook-instance — useHabits может вызываться
    // одновременно на /habits и /today, и общее имя приводит к
    // «cannot add postgres_changes callbacks after subscribe()».
    const channelName = `habits-changes-${Math.random().toString(36).slice(2, 10)}`
    try {
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Habit
            if (row.archived) return
            setHabits(prev => (prev.some(h => h.id === row.id) ? prev : [...prev, row]))
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as Habit
            if (row.archived) {
              // Архивирование = убираем из видимого списка.
              setHabits(prev => prev.filter(h => h.id !== row.id))
            } else {
              setHabits(prev => prev.map(h => (h.id === row.id ? row : h)))
            }
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as Partial<Habit>
            if (row.id) {
              setHabits(prev => prev.filter(h => h.id !== row.id))
              // Логи привычки пропадут через cascade-delete; страхуем стейт.
              setLogs(prev => prev.filter(l => l.habit_id !== row.id))
            }
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as HabitLog
            setLogs(prev => (prev.some(l => l.id === row.id) ? prev : [...prev, row]))
          } else if (payload.eventType === 'UPDATE') {
            const row = payload.new as HabitLog
            setLogs(prev => prev.map(l => (l.id === row.id ? row : l)))
          } else if (payload.eventType === 'DELETE') {
            const row = payload.old as Partial<HabitLog>
            if (row.id) {
              setLogs(prev => prev.filter(l => l.id !== row.id))
            }
          }
        })
        .subscribe()
    } catch (err) {
      console.warn('[useHabits] subscription failed:', err)
    }
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [fetchAll, supabase])

  const createHabit = useCallback(async (habit: Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'archived'>) => {
    // id заранее — чтобы realtime INSERT не задвоил оптимистичную строку.
    const id = crypto.randomUUID()
    const { data, error } = await supabase
      .from('habits')
      .insert({ ...habit, id, archived: false })
      .select()
      .single()
    if (data) {
      setHabits(prev => (prev.some(h => h.id === id) ? prev : [...prev, data as Habit]))
    }
    return { data, error }
  }, [supabase])

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h))
    const { error } = await supabase
      .from('habits')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) fetchAll()
    return { error }
  }, [supabase, fetchAll])

  const deleteHabit = useCallback(async (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id))
    setLogs(prev => prev.filter(l => l.habit_id !== id))
    const { error } = await supabase.from('habits').delete().eq('id', id)
    if (error) fetchAll()
    return { error }
  }, [supabase, fetchAll])

  /** Переключить отметку выполнения привычки на дату (yyyy-MM-dd). */
  const toggleLog = useCallback(async (habitId: string, date: string) => {
    const existing = logs.find(l => l.habit_id === habitId && l.date === date)
    if (existing) {
      // снять отметку
      setLogs(prev => prev.filter(l => l.id !== existing.id))
      const { error } = await supabase.from('habit_logs').delete().eq('id', existing.id)
      if (error) fetchAll()
      return { error }
    }
    // поставить отметку (оптимистично) — id заранее для realtime-dedup.
    const id = crypto.randomUUID()
    const optimistic: HabitLog = {
      id,
      habit_id: habitId,
      date,
      created_at: new Date().toISOString(),
    }
    setLogs(prev => [...prev, optimistic])
    const { data, error } = await supabase
      .from('habit_logs')
      .insert({ id, habit_id: habitId, date })
      .select()
      .single()
    if (error) {
      setLogs(prev => prev.filter(l => l.id !== id))
      fetchAll()
    } else if (data) {
      setLogs(prev => prev.map(l => l.id === id ? (data as HabitLog) : l))
    }
    return { error }
  }, [supabase, fetchAll, logs])

  return { habits, logs, loading, createHabit, updateHabit, deleteHabit, toggleLog }
}
