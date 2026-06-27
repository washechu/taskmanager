import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dueStatus, dueIcon } from './dueStatus'

/**
 * Контрольная точка времени для всех тестов — 15 июня 2026 в 12:00 UTC.
 * Все «сегодня/вчера/завтра» отсчитываются от неё.
 */
const FROZEN_NOW = new Date('2026-06-15T12:00:00.000Z')

describe('dueStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('возвращает null если due_date пуст', () => {
    expect(dueStatus({ due_date: null, status: 'todo' })).toBe(null)
  })

  it('возвращает null если задача уже done', () => {
    // Даже если due_date в прошлом — закрытая не считается просроченной.
    expect(dueStatus({ due_date: '2026-06-10', status: 'done' })).toBe(null)
  })

  it('возвращает null для paused (м.029 — пауза ≠ провал)', () => {
    // До м.029 paused-задачи с прошедшим due попадали в overdue и в утренний
    // дайджест 🔥. Теперь paused считается «вернёмся позже» — не торопит.
    expect(dueStatus({ due_date: '2026-06-10', status: 'paused' })).toBe(null)
    expect(dueStatus({ due_date: '2026-06-15', status: 'paused' })).toBe(null)
    expect(dueStatus({ due_date: '2026-12-31', status: 'paused' })).toBe(null)
  })

  it('возвращает null для cancelled (м.028)', () => {
    // Отменённые задачи никогда не считаются просроченными.
    expect(dueStatus({ due_date: '2026-06-10', status: 'cancelled' })).toBe(null)
    expect(dueStatus({ due_date: '2026-06-15', status: 'cancelled' })).toBe(null)
  })

  it('overdue: due_date раньше сегодня', () => {
    expect(dueStatus({ due_date: '2026-06-14', status: 'todo' })).toBe('overdue')
    expect(dueStatus({ due_date: '2026-06-10', status: 'in_progress' })).toBe('overdue')
  })

  it('today: due_date = сегодня (день ещё не закончился)', () => {
    expect(dueStatus({ due_date: '2026-06-15', status: 'todo' })).toBe('today')
  })

  it('future: due_date позже сегодня', () => {
    expect(dueStatus({ due_date: '2026-06-16', status: 'todo' })).toBe('future')
    expect(dueStatus({ due_date: '2026-12-31', status: 'in_progress' })).toBe('future')
  })
})

describe('dueIcon', () => {
  it('маппит статусы в эмодзи', () => {
    expect(dueIcon('overdue')).toBe('🔥')
    expect(dueIcon('today')).toBe('⚠️')
  })

  it('возвращает пустую строку для future / null', () => {
    expect(dueIcon('future')).toBe('')
    expect(dueIcon(null)).toBe('')
  })
})
