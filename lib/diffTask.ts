import { STATUSES, PRIORITIES, CATEGORIES, ASSIGNEES, type Task, type Project } from '@/lib/types'

/**
 * Returns a list of human-readable change descriptions between an old task
 * and a partial update. Used to produce audit comments.
 */
export function diffTask(oldT: Task, updates: Partial<Task>, projects: Project[]): string[] {
  const out: string[] = []
  const projectTitle = (id: string | null | undefined) =>
    id ? projects.find(p => p.id === id)?.title ?? '—' : '—'

  if ('title' in updates && updates.title !== undefined && updates.title !== oldT.title) {
    out.push(`Название: «${oldT.title}» → «${updates.title}»`)
  }
  if ('status' in updates && updates.status !== undefined && updates.status !== oldT.status) {
    out.push(`Статус: ${STATUSES[oldT.status].label} → ${STATUSES[updates.status].label}`)
  }
  if ('priority' in updates && updates.priority !== undefined && updates.priority !== oldT.priority) {
    out.push(`Приоритет: ${PRIORITIES[oldT.priority].label} → ${PRIORITIES[updates.priority].label}`)
  }
  if ('category' in updates && updates.category !== undefined && updates.category !== oldT.category) {
    out.push(`Категория: ${CATEGORIES[oldT.category].label} → ${CATEGORIES[updates.category].label}`)
  }
  if ('assignees' in updates && updates.assignees !== undefined) {
    const oldSet = new Set(oldT.assignees)
    const newSet = new Set(updates.assignees)
    const added   = updates.assignees.filter(a => !oldSet.has(a))
    const removed = oldT.assignees.filter(a => !newSet.has(a))
    if (added.length)   out.push(`Добавлен ответственный: ${added.map(a => ASSIGNEES[a].label).join(', ')}`)
    if (removed.length) out.push(`Убран ответственный: ${removed.map(a => ASSIGNEES[a].label).join(', ')}`)
  }
  if ('project_id' in updates && updates.project_id !== oldT.project_id) {
    out.push(`Проект: ${projectTitle(oldT.project_id)} → ${projectTitle(updates.project_id)}`)
  }
  if ('due_date' in updates && updates.due_date !== oldT.due_date) {
    out.push(`Дедлайн: ${oldT.due_date ?? '—'} → ${updates.due_date ?? '—'}`)
  }
  if ('start_date' in updates && updates.start_date !== oldT.start_date) {
    out.push(`Начало: ${oldT.start_date ?? '—'} → ${updates.start_date ?? '—'}`)
  }
  if ('description' in updates && (updates.description ?? '') !== (oldT.description ?? '')) {
    out.push(`Описание обновлено`)
  }
  if ('tags' in updates && updates.tags !== undefined) {
    const oldSet = new Set(oldT.tags)
    const newSet = new Set(updates.tags)
    const added   = updates.tags.filter(t => !oldSet.has(t))
    const removed = oldT.tags.filter(t => !newSet.has(t))
    if (added.length)   out.push(`Добавлен тег: ${added.map(t => `«${t}»`).join(', ')}`)
    if (removed.length) out.push(`Удалён тег: ${removed.map(t => `«${t}»`).join(', ')}`)
  }
  return out
}
