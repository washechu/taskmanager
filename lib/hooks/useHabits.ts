'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Habit, HabitLog } from '@/lib/types'

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
    try {
      channel = supabase
        .channel('habits-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, () => fetchAll())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, () => fetchAll())
        .subscribe()
    } catch (err) {
      console.warn('[useHabits] subscription failed:', err)
    }
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [fetchAll, supabase])

  const createHabit = useCallback(async (habit: Omit<Habit, 'id' | 'created_at' | 'updated_at' | 'archived'>) => {
    const { data, error } = await supabase
      .from('habits')
      .insert({ ...habit, archived: false })
      .select()
      .single()
    if (data) setHabits(prev => [...prev, data as Habit])
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
    // поставить отметку (оптимистично)
    const optimistic: HabitLog = {
      id: crypto.randomUUID(),
      habit_id: habitId,
      date,
      created_at: new Date().toISOString(),
    }
    setLogs(prev => [...prev, optimistic])
    const { data, error } = await supabase
      .from('habit_logs')
      .insert({ habit_id: habitId, date })
      .select()
      .single()
    if (error) {
      setLogs(prev => prev.filter(l => l.id !== optimistic.id))
      fetchAll()
    } else if (data) {
      setLogs(prev => prev.map(l => l.id === optimistic.id ? (data as HabitLog) : l))
    }
    return { error }
  }, [supabase, fetchAll, logs])

  return { habits, logs, loading, createHabit, updateHabit, deleteHabit, toggleLog }
}
