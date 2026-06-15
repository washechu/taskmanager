import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildDoneSet,
  computeBestStreak,
  computeCompletionRate,
  computeCurrentStreak,
  computeTotalCompletions,
} from './habitStats'
import type { Habit, HabitLog } from './types'

// Замораживаем время на пятницу 2026-06-12 (ISO weekday 5).
const NOW = new Date('2026-06-12T12:00:00.000Z')

function habit(o: Partial<Habit> = {}): Habit {
  return {
    id: 'h', title: 'H', description: null, icon: null,
    category: 'personal', assignee: 'nick',
    schedule_type: 'daily',
    weekdays: [], monthdays: [],
    color: 'blue', archived: false,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...o,
  }
}
function log(habitId: string, date: string): HabitLog {
  return { id: `${habitId}-${date}`, habit_id: habitId, date, created_at: '' }
}

describe('buildDoneSet', () => {
  it('фильтрует по habit_id и собирает даты', () => {
    const logs = [
      log('h1', '2026-06-10'),
      log('h2', '2026-06-10'),
      log('h1', '2026-06-11'),
    ]
    expect(buildDoneSet('h1', logs)).toEqual(new Set(['2026-06-10', '2026-06-11']))
    expect(buildDoneSet('h2', logs)).toEqual(new Set(['2026-06-10']))
    expect(buildDoneSet('h3', logs)).toEqual(new Set())
  })
})

describe('computeTotalCompletions', () => {
  it('считает только логи нужной привычки', () => {
    const logs = [log('h1', '2026-06-10'), log('h2', '2026-06-10'), log('h1', '2026-06-11')]
    expect(computeTotalCompletions('h1', logs)).toBe(2)
    expect(computeTotalCompletions('h2', logs)).toBe(1)
    expect(computeTotalCompletions('h3', logs)).toBe(0)
  })
})

describe('computeCurrentStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('daily: подряд от сегодня', () => {
    // Сегодня + вчера + позавчера выполнены, до этого — нет.
    const doneSet = new Set(['2026-06-12', '2026-06-11', '2026-06-10'])
    expect(computeCurrentStreak(habit({ schedule_type: 'daily' }), doneSet)).toBe(3)
  })

  it('daily: первый пропуск обрывает', () => {
    // Сегодня выполнено, вчера — нет.
    const doneSet = new Set(['2026-06-12'])
    expect(computeCurrentStreak(habit({ schedule_type: 'daily' }), doneSet)).toBe(1)
  })

  it('daily: 0 если сегодня не выполнено', () => {
    const doneSet = new Set(['2026-06-11', '2026-06-10'])
    expect(computeCurrentStreak(habit({ schedule_type: 'daily' }), doneSet)).toBe(0)
  })

  it('weekdays: учитывает только запланированные дни', () => {
    // Привычка по Пн/Ср/Пт (1,3,5). Сегодня (Пт), Ср и Пн выполнены подряд →
    // streak=3. Дни между (Вт/Чт) — не запланированы, не считаются пропусками.
    const doneSet = new Set(['2026-06-12', '2026-06-10', '2026-06-08'])
    expect(computeCurrentStreak(
      habit({ schedule_type: 'weekdays', weekdays: [1, 3, 5] }),
      doneSet,
    )).toBe(3)
  })

  it('пустой doneSet → 0', () => {
    expect(computeCurrentStreak(habit(), new Set())).toBe(0)
  })
})

describe('computeBestStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('находит самую длинную серию за всё время', () => {
    // 3 подряд → пропуск → 2 подряд → итого best = 3
    const doneSet = new Set([
      '2026-06-04', '2026-06-05', '2026-06-06',  // 3 подряд
      // 06-07 пропущен
      '2026-06-08', '2026-06-09',                  // 2 подряд
    ])
    expect(computeBestStreak(
      habit({ schedule_type: 'daily', created_at: '2026-06-01T00:00:00Z' }),
      doneSet,
    )).toBe(3)
  })

  it('best ≥ current', () => {
    const doneSet = new Set([
      '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05',  // best=4
      // gap
      '2026-06-12',  // current=1
    ])
    const h = habit({ schedule_type: 'daily', created_at: '2026-06-01T00:00:00Z' })
    expect(computeBestStreak(h, doneSet)).toBe(4)
    expect(computeCurrentStreak(h, doneSet)).toBe(1)
  })

  it('0 если ни одного лога', () => {
    expect(computeBestStreak(habit(), new Set())).toBe(0)
  })
})

describe('computeCompletionRate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('daily: 50% за последние 4 дня (2 из 4)', () => {
    const doneSet = new Set(['2026-06-12', '2026-06-10'])
    expect(computeCompletionRate(habit({ schedule_type: 'daily' }), doneSet, 4)).toBe(50)
  })

  it('100%: все запланированные выполнены', () => {
    const doneSet = new Set(['2026-06-12', '2026-06-11', '2026-06-10'])
    expect(computeCompletionRate(habit({ schedule_type: 'daily' }), doneSet, 3)).toBe(100)
  })

  it('null: если за период не было запланированных дней', () => {
    // weekday-привычка только по воскресеньям, окно 3 дня (Ср-Чт-Пт)
    expect(computeCompletionRate(
      habit({ schedule_type: 'weekdays', weekdays: [7] }),
      new Set(),
      3,
    )).toBe(null)
  })

  it('округление до целого', () => {
    // 1 из 3 = 33.33 → 33
    const doneSet = new Set(['2026-06-12'])
    expect(computeCompletionRate(habit({ schedule_type: 'daily' }), doneSet, 3)).toBe(33)
  })
})
