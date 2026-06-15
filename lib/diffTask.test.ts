import { describe, it, expect } from 'vitest'
import { diffTask } from './diffTask'
import type { Task, Project } from './types'

const PROJECTS: Project[] = [
  { id: 'p1', title: 'Quartira', description: null, status: 'in_progress',
    category: 'personal', assignees: ['nick'],
    start_date: null, due_date: null, created_at: '', updated_at: '' },
  { id: 'p2', title: 'Zubi', description: null, status: 'in_progress',
    category: 'personal', assignees: ['nick'],
    start_date: null, due_date: null, created_at: '', updated_at: '' },
]

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1', title: 'X', description: null,
    status: 'todo', priority: 'medium', category: 'personal',
    project_id: null, assignees: ['nick'],
    due_date: null, start_date: null, tags: [],
    invited_by: null, invite_status: 'none',
    completed_at: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('diffTask', () => {
  it('пустые updates → пустой массив', () => {
    expect(diffTask(task(), {}, PROJECTS)).toEqual([])
  })

  it('title: изменение пишется с цитатами', () => {
    const out = diffTask(task({ title: 'Old' }), { title: 'New' }, PROJECTS)
    expect(out).toEqual(['Название: «Old» → «New»'])
  })

  it('title: если не поменялся → ничего', () => {
    expect(diffTask(task({ title: 'Same' }), { title: 'Same' }, PROJECTS)).toEqual([])
  })

  it('status: маппит лейблы', () => {
    expect(diffTask(task({ status: 'todo' }), { status: 'in_progress' }, PROJECTS))
      .toEqual(['Статус: Беклог → В процессе'])
  })

  it('priority и category пишутся отдельно', () => {
    const out = diffTask(
      task({ priority: 'low', category: 'personal' }),
      { priority: 'high', category: 'family' },
      PROJECTS,
    )
    expect(out).toContain('Приоритет: Низкий → Высокий')
    expect(out).toContain('Категория: Личное → Семейное')
  })

  it('assignees: добавление и удаление участников', () => {
    const out = diffTask(
      task({ assignees: ['nick'] }),
      { assignees: ['nick', 'galya'] },
      PROJECTS,
    )
    expect(out).toEqual(['Добавлен участник: Галочка'])
  })

  it('assignees: удаление участника', () => {
    const out = diffTask(
      task({ assignees: ['nick', 'galya'] }),
      { assignees: ['nick'] },
      PROJECTS,
    )
    expect(out).toEqual(['Убран участник: Галочка'])
  })

  it('project_id: резолвит названия проектов', () => {
    const out = diffTask(task({ project_id: 'p1' }), { project_id: 'p2' }, PROJECTS)
    expect(out).toEqual(['Проект: Quartira → Zubi'])
  })

  it('project_id: null → проект', () => {
    const out = diffTask(task({ project_id: null }), { project_id: 'p1' }, PROJECTS)
    expect(out).toEqual(['Проект: — → Quartira'])
  })

  it('due_date / start_date: ISO как есть, null → «—»', () => {
    const out = diffTask(
      task({ due_date: null, start_date: '2026-06-10' }),
      { due_date: '2026-06-15', start_date: null },
      PROJECTS,
    )
    expect(out).toContain('Дедлайн: — → 2026-06-15')
    expect(out).toContain('Начало: 2026-06-10 → —')
  })

  it('description: пишет только факт «обновлено», без диффа', () => {
    const out = diffTask(
      task({ description: 'old' }),
      { description: 'new long text' },
      PROJECTS,
    )
    expect(out).toEqual(['Описание обновлено'])
  })

  it('description: null vs пустая строка эквивалентны (нет дельты)', () => {
    expect(diffTask(task({ description: null }), { description: '' }, PROJECTS)).toEqual([])
  })

  it('tags: + и -', () => {
    const out = diffTask(
      task({ tags: ['a', 'b'] }),
      { tags: ['b', 'c'] },
      PROJECTS,
    )
    expect(out).toContain('Добавлен тег: «c»')
    expect(out).toContain('Удалён тег: «a»')
  })

  it('invite_status: pending → accepted', () => {
    const out = diffTask(
      task({ invite_status: 'pending' }),
      { invite_status: 'accepted' },
      PROJECTS,
    )
    expect(out).toEqual(['Принял предложение'])
  })

  it('invite_status: pending → none ≡ Отклонил (если actor не инициатор)', () => {
    const out = diffTask(
      task({ invite_status: 'pending', invited_by: 'galya' }),
      { invite_status: 'none' },
      PROJECTS,
      'nick',
    )
    expect(out).toEqual(['Отклонил предложение'])
  })

  it('invite_status: pending → none ≡ Отозвал (если actor == инициатор)', () => {
    const out = diffTask(
      task({ invite_status: 'pending', invited_by: 'nick' }),
      { invite_status: 'none' },
      PROJECTS,
      'nick',
    )
    expect(out).toEqual(['Отозвал предложение'])
  })

  it('invite_status: accepted ↔ tentative — «Изменил ответ»', () => {
    expect(diffTask(
      task({ invite_status: 'accepted' }),
      { invite_status: 'tentative' },
      PROJECTS,
    )).toEqual(['Изменил ответ: думаю'])

    expect(diffTask(
      task({ invite_status: 'tentative' }),
      { invite_status: 'accepted' },
      PROJECTS,
    )).toEqual(['Изменил ответ: принял'])
  })
})
