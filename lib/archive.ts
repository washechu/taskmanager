import { isBefore, subDays } from 'date-fns'

/** Срок, после которого выполненная задача считается архивной. */
export const ARCHIVE_DAYS = 14

/**
 * Задача-«архив»: статус `done` и дата фактического закрытия старше
 * {@link ARCHIVE_DAYS}. Используем `completed_at` (м.026) — точная дата
 * первого перехода в done. Fallback на `updated_at` для старых задач,
 * закрытых ДО м.026 (там completed_at = null).
 *
 * Раньше использовалось только `updated_at` — это было хрупко: любая правка
 * done-задачи (тег, коммент через realtime → updated_at смены) сбрасывала
 * 14-дневный счётчик.
 *
 * Архивные задачи скрываются из «свежих» видов (Канбан → «Готово»,
 * Список → slice «Все») до явного раскрытия пользователем.
 */
export function isArchivedTask(
  task: { status: string; updated_at: string; completed_at?: string | null },
  now: Date = new Date(),
): boolean {
  if (task.status !== 'done') return false
  const closedAt = task.completed_at ?? task.updated_at
  return isBefore(new Date(closedAt), subDays(now, ARCHIVE_DAYS))
}
