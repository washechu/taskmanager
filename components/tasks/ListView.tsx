'use client'

import { useMemo, useState } from 'react'
import {
  startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isSameDay, isWithinInterval, parseISO,
} from 'date-fns'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { dueStatus, dueIcon, isDeferred } from '@/lib/dueStatus'
import { isArchivedTask, ARCHIVE_DAYS } from '@/lib/archive'
import {
  STATUSES, STATUS_ORDER, type Status, type Task, type Project,
} from '@/lib/types'

type SortKey = 'title' | 'status' | 'priority' | 'due_date' | 'assignee' | 'project'
type SortDir = 'asc' | 'desc'
type Slice = 'today' | 'week' | 'month' | 'all'

interface ListViewProps {
  tasks: Task[]
  projects: Project[]
  onTaskOpen: (task: Task) => void
  onStatusChange: (id: string, status: Status) => void
}

const STATUS_RANK: Record<Status, number> = { todo: 0, in_progress: 1, paused: 2, done: 3 }
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

const SLICE_OPTIONS = [
  { value: 'today' as const, label: 'Сегодня' },
  { value: 'week'  as const, label: 'Неделя'  },
  { value: 'month' as const, label: 'Месяц'   },
  { value: 'all'   as const, label: 'Все'     },
]

export function ListView({ tasks, projects, onTaskOpen, onStatusChange }: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('due_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [slice, setSlice] = useState<Slice>('all')
  const [showArchive, setShowArchive] = useState(false)

  // Архивные (done старше 14 дней) — считаем только когда slice=all (там
  // показываем «всё»). В time-bounded срезах архив нерелевантен.
  const archivedInAll = useMemo(
    () => slice === 'all' ? tasks.filter(t => isArchivedTask(t)) : [],
    [tasks, slice],
  )

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // Slice по due_date: today/week/month — задачи без dl исключаются;
  // all — показывает всё (включая без дедлайна), и тут же скрывает архив
  // (done старше 14 дней), пока пользователь не раскроет.
  const sliced = useMemo(() => {
    if (slice === 'all') {
      return showArchive ? tasks : tasks.filter(t => !isArchivedTask(t))
    }
    const today = startOfDay(new Date())
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)
    return tasks.filter(t => {
      if (!t.due_date) return false
      const d = parseISO(t.due_date)
      if (slice === 'today') return isSameDay(d, today)
      if (slice === 'week')  return isWithinInterval(d, { start: weekStart, end: weekEnd })
      return isWithinInterval(d, { start: monthStart, end: monthEnd })
    })
  }, [tasks, slice, showArchive])

  const sorted = useMemo(() => {
    const arr = [...sliced]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'title':    cmp = a.title.localeCompare(b.title); break
        case 'status':   cmp = STATUS_RANK[a.status] - STATUS_RANK[b.status]; break
        case 'priority': cmp = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]; break
        case 'assignee': cmp = a.assignees.join(',').localeCompare(b.assignees.join(',')); break
        case 'project':
          cmp = (projects.find(p => p.id === a.project_id)?.title ?? '')
            .localeCompare(projects.find(p => p.id === b.project_id)?.title ?? '')
          break
        case 'due_date':
          if (!a.due_date && !b.due_date) cmp = 0
          else if (!a.due_date) cmp = 1
          else if (!b.due_date) cmp = -1
          else cmp = a.due_date.localeCompare(b.due_date)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [sliced, sortKey, sortDir, projects])

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          variant="view"
          value={slice}
          onChange={(v) => { setSlice(v); setShowArchive(false) }}
          ariaLabel="Фильтр по дедлайну"
          options={SLICE_OPTIONS}
        />
        {slice === 'all' && archivedInAll.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchive(s => !s)}
            className="text-xs text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {showArchive
              ? `Скрыть архив`
              : `Архив (${archivedInAll.length}, старше ${ARCHIVE_DAYS} дней)`}
          </button>
        )}
      </div>

      <div className="overflow-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <Th onClick={() => toggle('title')}    label={`Название${arrow('title')}`} />
              <Th onClick={() => toggle('status')}   label={`Статус${arrow('status')}`} />
              <Th onClick={() => toggle('priority')} label={`Приоритет${arrow('priority')}`} />
              <Th onClick={() => toggle('project')}  label={`Проект${arrow('project')}`} className="hidden md:table-cell" />
              <Th onClick={() => toggle('assignee')} label={`Кто${arrow('assignee')}`} className="hidden md:table-cell" />
              <Th onClick={() => toggle('due_date')} label={`Дедлайн${arrow('due_date')}`} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map(task => {
              const project = projects.find(p => p.id === task.project_id)
              const due = dueStatus(task)
              const dueCls =
                due === 'overdue' ? 'text-red-500 font-medium' :
                due === 'today'   ? 'text-orange-500 font-medium' :
                                    'text-gray-400'

              return (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                >
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onTaskOpen(task)}
                      className="text-left text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
                    >
                      {isDeferred(task) && <span title="Отложена">💤 </span>}{task.title}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={task.status}
                      onChange={e => onStatusChange(task.id, e.target.value as Status)}
                      className="rounded-md border border-gray-200 bg-transparent px-1.5 py-0.5 text-xs dark:border-gray-700"
                    >
                      {STATUS_ORDER.map(s => (
                        <option key={s} value={s}>{STATUSES[s].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2"><PriorityBadge priority={task.priority} /></td>
                  <td className="hidden px-3 py-2 text-sm text-gray-400 md:table-cell">
                    {project?.title ?? '—'}
                  </td>
                  <td className="hidden px-3 py-2 text-sm text-gray-400 md:table-cell">
                    {task.assignees.length === 0
                      ? '—'
                      : task.assignees.map(a => a === 'nick' ? 'Никита' : 'Галочка').join(' + ')}
                  </td>
                  <td className={`px-3 py-2 text-sm ${dueCls}`}>
                    {task.due_date
                      ? <>{due && due !== 'future' ? `${dueIcon(due)} ` : ''}{task.due_date}</>
                      : '—'}
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">
                  {slice === 'all'
                    ? 'Задач нет'
                    : slice === 'today'
                      ? 'На сегодня задач нет'
                      : slice === 'week'
                        ? 'На этой неделе задач нет'
                        : 'В этом месяце задач нет'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({
  label, onClick, className = '',
}: { label: string; onClick: () => void; className?: string }) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold text-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 ${className}`}
    >
      {label}
    </th>
  )
}
