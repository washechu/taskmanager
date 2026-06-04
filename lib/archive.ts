import { isBefore, subDays } from 'date-fns'

/** Срок, после которого выполненная задача считается архивной. */
export const ARCHIVE_DAYS = 14

/**
 * Задача-«архив»: статус `done` и `updated_at` старше {@link ARCHIVE_DAYS}.
 * Архивные задачи скрываются из «свежих» видов (Канбан → «Готово»,
 * Список → slice «Все») до явного раскрытия пользователем. Остаются
 * в БД, доступны через раскрытие архива или временно́е переключение
 * в Списке (срез не учитывает архив — это про другое окно).
 */
export function isArchivedTask(
  task: { status: string; updated_at: string },
  now: Date = new Date(),
): boolean {
  return task.status === 'done' && isBefore(new Date(task.updated_at), subDays(now, ARCHIVE_DAYS))
}
