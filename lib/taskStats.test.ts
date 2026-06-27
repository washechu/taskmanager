import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { aggregateTtm, computeTaskStats, formatDays } from './taskStats'
import type { Task } from './types'

const NOW = new Date('2026-06-15T12:00:00.000Z')

function task(o: Partial<Task> = {}): Task {
  return {
    id: 't', title: 'T', description: null,
    status: 'todo', priority: 'medium', category: 'personal',
    project_id: null, assignees: [],
    due_date: null, start_date: null, tags: [],
    invited_by: null, invite_status: 'none',
    completed_at: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...o,
  }
}

describe('formatDays', () => {
  it('null → «—»', () => {
    expect(formatDays(null)).toBe('—')
  })

  it('меньше дня → «<1»', () => {
    expect(formatDays(0)).toBe('<1')
    expect(formatDays(0.4)).toBe('<1')
  })

  it('число дней округляется', () => {
    expect(formatDays(1)).toBe('1')
    expect(formatDays(3.2)).toBe('3')
    expect(formatDays(3.6)).toBe('4')
    expect(formatDays(12)).toBe('12')
  })
})

describe('computeTaskStats', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('todo: только totalDays, inProgress = null', () => {
    const s = computeTaskStats(task({ status: 'todo', created_at: '2026-06-10T00:00:00Z' }))
    expect(s.inProgressDays).toBe(null)
    expect(s.totalDays).toBe(5)  // 15 - 10
    expect(s.dueDelta).toBe(null) // нет дедлайна
  })

  it('in_progress: считает с момента start_date до сегодня', () => {
    const s = computeTaskStats(task({
      status: 'in_progress',
      created_at: '2026-06-08T00:00:00Z',
      start_date: '2026-06-12',
      due_date: '2026-06-18',
    }))
    expect(s.inProgressDays).toBe(3)  // 15 - 12
    expect(s.totalDays).toBe(7)        // 15 - 08
    expect(s.dueDelta).toBe(3)         // 18 - 15 (запас)
  })

  it('done: считает до completed_at, не до now', () => {
    const s = computeTaskStats(task({
      status: 'done',
      created_at: '2026-06-01T00:00:00Z',
      start_date: '2026-06-05',
      due_date: '2026-06-15',
      completed_at: '2026-06-10T00:00:00Z',
    }))
    expect(s.inProgressDays).toBe(5)   // 10 - 05
    expect(s.totalDays).toBe(9)         // 10 - 01
    expect(s.dueDelta).toBe(5)          // due (15) - completed (10) = опередили на 5
  })

  it('done: опоздание = отрицательный dueDelta', () => {
    const s = computeTaskStats(task({
      status: 'done',
      created_at: '2026-06-01T00:00:00Z',
      start_date: '2026-06-05',
      due_date: '2026-06-10',
      completed_at: '2026-06-12T00:00:00Z',
    }))
    expect(s.dueDelta).toBe(-2)
  })

  it('done без completed_at (legacy ДО м.026) → fallback на updated_at', () => {
    // Регрессия: задачи, закрытые ДО применения м.026, имеют completed_at=null
    // (триггер не делает backfill). До фикса reference падал на now, и
    // «Опоздали на» / «От создания» каждый день увеличивались — пользователь
    // видел «задача давно done, а счётчик тикает». Fallback на updated_at
    // не идеален (двигается от любой правки), но лучше now.
    const s = computeTaskStats(task({
      status: 'done',
      created_at: '2026-05-15T00:00:00Z',
      start_date: '2026-05-20',
      due_date:   '2026-05-20',
      completed_at: null,                       // ← legacy
      updated_at: '2026-06-09T00:00:00Z',       // когда закрыли (приближение)
    }))
    // 9 июня - 15 мая = 25 дней (как у пользователя в скриншоте)
    expect(s.totalDays).toBe(25)
    // due 20 мая - completed (=updated_at 9 июня) = -20 → «опоздали на 20»
    expect(s.dueDelta).toBe(-20)
    // НЕ должно зависеть от текущего времени (NOW = 15 июня):
    // total НЕ должен быть 31 (15 июня - 15 мая), а dueDelta НЕ -26.
  })

  it('просрочена (todo с прошедшим due) → dueDelta < 0', () => {
    const s = computeTaskStats(task({
      status: 'todo',
      created_at: '2026-06-10T00:00:00Z',
      due_date: '2026-06-13',
    }))
    expect(s.dueDelta).toBe(-2)
  })
})

describe('aggregateTtm', () => {
  const rangeStart = new Date('2026-06-01T00:00:00Z')
  const rangeEnd = new Date('2026-06-30T23:59:59Z')

  it('пустой массив → null/0', () => {
    const agg = aggregateTtm([], rangeStart, rangeEnd)
    expect(agg.cycle).toBe(null)
    expect(agg.lead).toBe(null)
    expect(agg.queue).toBe(null)
    expect(agg.count).toBe(0)
  })

  it('не учитывает не-done задачи', () => {
    const tasks = [task({ status: 'in_progress', completed_at: '2026-06-15T00:00:00Z', start_date: '2026-06-10' })]
    const agg = aggregateTtm(tasks, rangeStart, rangeEnd)
    expect(agg.count).toBe(0)
  })

  it('не учитывает done без start_date (старые задачи)', () => {
    const tasks = [task({ status: 'done', completed_at: '2026-06-15T00:00:00Z', start_date: null })]
    const agg = aggregateTtm(tasks, rangeStart, rangeEnd)
    expect(agg.count).toBe(0)
  })

  it('не учитывает задачи, закрытые вне окна', () => {
    const tasks = [task({
      status: 'done',
      created_at: '2026-05-01T00:00:00Z',
      start_date: '2026-05-05',
      completed_at: '2026-05-10T00:00:00Z',  // вне диапазона
    })]
    const agg = aggregateTtm(tasks, rangeStart, rangeEnd)
    expect(agg.count).toBe(0)
  })

  it('среднее по двум задачам', () => {
    const tasks = [
      task({
        id: 'a', status: 'done',
        created_at: '2026-06-01T00:00:00Z',
        start_date: '2026-06-05',
        completed_at: '2026-06-10T00:00:00Z',
        // cycle 5, lead 9, queue 4
      }),
      task({
        id: 'b', status: 'done',
        created_at: '2026-06-01T00:00:00Z',
        start_date: '2026-06-03',
        completed_at: '2026-06-08T00:00:00Z',
        // cycle 5, lead 7, queue 2
      }),
    ]
    const agg = aggregateTtm(tasks, rangeStart, rangeEnd)
    expect(agg.count).toBe(2)
    expect(agg.cycle).toBe(5)            // (5+5)/2
    expect(agg.lead).toBe(8)              // (9+7)/2
    expect(agg.queue).toBe(3)             // (4+2)/2
  })

  it('округление до 0.1', () => {
    const tasks = [
      task({ id: 'a', status: 'done', created_at: '2026-06-01T00:00:00Z',
        start_date: '2026-06-05', completed_at: '2026-06-08T00:00:00Z' }), // cycle 3
      task({ id: 'b', status: 'done', created_at: '2026-06-01T00:00:00Z',
        start_date: '2026-06-05', completed_at: '2026-06-09T00:00:00Z' }), // cycle 4
      task({ id: 'c', status: 'done', created_at: '2026-06-01T00:00:00Z',
        start_date: '2026-06-05', completed_at: '2026-06-09T00:00:00Z' }), // cycle 4
    ]
    const agg = aggregateTtm(tasks, rangeStart, rangeEnd)
    // (3+4+4)/3 = 3.666... → 3.7
    expect(agg.cycle).toBe(3.7)
  })
})
