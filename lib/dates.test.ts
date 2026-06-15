import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatShortDate, formatRelativeDate } from './dates'

const FROZEN_NOW = new Date('2026-06-15T12:00:00.000Z')

describe('formatShortDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('возвращает пустую строку для null/undefined/empty', () => {
    expect(formatShortDate(null)).toBe('')
    expect(formatShortDate(undefined)).toBe('')
    expect(formatShortDate('')).toBe('')
  })

  it('текущий год: «d MMM» без года (date-fns ru добавляет точку: «15 июн.»)', () => {
    expect(formatShortDate('2026-06-15')).toBe('15 июн.')
    expect(formatShortDate('2026-01-01')).toBe('1 янв.')
    expect(formatShortDate('2026-12-31')).toBe('31 дек.')
  })

  it('другой год: с указанием года', () => {
    expect(formatShortDate('2025-12-31')).toBe('31 дек. 2025')
    expect(formatShortDate('2027-01-01')).toBe('1 янв. 2027')
  })

  it('понимает полный timestamptz (completed_at)', () => {
    expect(formatShortDate('2026-06-15T10:07:14.000Z')).toBe('15 июн.')
  })
})

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FROZEN_NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('пустая строка для null', () => {
    expect(formatRelativeDate(null)).toBe('')
  })

  it('сегодня / завтра / вчера', () => {
    expect(formatRelativeDate('2026-06-15')).toBe('сегодня')
    expect(formatRelativeDate('2026-06-16')).toBe('завтра')
    expect(formatRelativeDate('2026-06-14')).toBe('вчера')
  })

  it('дальние даты — fallback на formatShortDate', () => {
    expect(formatRelativeDate('2026-06-20')).toBe('20 июн.')
    expect(formatRelativeDate('2026-06-10')).toBe('10 июн.')
    expect(formatRelativeDate('2025-12-31')).toBe('31 дек. 2025')
  })
})
