import { describe, it, expect } from 'vitest'
import { isArchivedTask, ARCHIVE_DAYS } from './archive'

const NOW = new Date('2026-06-15T12:00:00.000Z')

describe('isArchivedTask', () => {
  it('не done — никогда не архивная', () => {
    expect(isArchivedTask(
      { status: 'todo', updated_at: '2020-01-01T00:00:00Z' },
      NOW,
    )).toBe(false)

    expect(isArchivedTask(
      { status: 'in_progress', updated_at: '2020-01-01T00:00:00Z', completed_at: null },
      NOW,
    )).toBe(false)
  })

  it('done без completed_at: fallback на updated_at', () => {
    // Очень старая done-задача (закрыта ДО м.026) — нет completed_at, считаем по updated_at.
    expect(isArchivedTask(
      { status: 'done', updated_at: '2026-05-01T00:00:00Z', completed_at: null },
      NOW,
    )).toBe(true)

    // Done свежее ARCHIVE_DAYS — не архивная.
    expect(isArchivedTask(
      { status: 'done', updated_at: '2026-06-10T00:00:00Z' },
      NOW,
    )).toBe(false)
  })

  it('done с completed_at: считаем по нему, игнорируем updated_at', () => {
    // completed_at старый (> 14 дней), updated_at свежий (правили тег, например).
    // Раньше задача "оживала" — теперь правильно архивная.
    expect(isArchivedTask(
      {
        status: 'done',
        updated_at: '2026-06-14T00:00:00Z',   // вчерашняя правка
        completed_at: '2026-05-01T00:00:00Z', // закрыта 1.5 месяца назад
      },
      NOW,
    )).toBe(true)

    // completed_at свежий — не архивная, даже если updated_at тоже свежий.
    expect(isArchivedTask(
      {
        status: 'done',
        updated_at: '2026-06-14T00:00:00Z',
        completed_at: '2026-06-10T00:00:00Z',
      },
      NOW,
    )).toBe(false)
  })

  it('граница — ровно ARCHIVE_DAYS', () => {
    // На границе: completed_at = now - ARCHIVE_DAYS. isBefore(d, subDays(now,14)) → false.
    const boundary = new Date(NOW.getTime() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000).toISOString()
    expect(isArchivedTask(
      { status: 'done', updated_at: boundary, completed_at: boundary },
      NOW,
    )).toBe(false)
  })

  it('ARCHIVE_DAYS = 14', () => {
    expect(ARCHIVE_DAYS).toBe(14)
  })
})
