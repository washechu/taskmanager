'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { startOfDay, isBefore, parseISO, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useTasks } from '@/lib/hooks/useTasks'
import { useProjects } from '@/lib/hooks/useProjects'
import { useHabits } from '@/lib/hooks/useHabits'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useAuditedTaskUpdate } from '@/lib/hooks/useAuditedTaskUpdate'
import { TaskModal } from '@/components/tasks/TaskModal'
import { TaskForm } from '@/components/tasks/TaskForm'
import { Fab } from '@/components/ui/Fab'
import { Modal } from '@/components/ui/Modal'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { dueStatus, dueIcon } from '@/lib/dueStatus'
import { isHabitScheduledOn, type Task, type Habit, type Project } from '@/lib/types'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

const HABIT_BG: Record<string, string> = {
  gray:   'bg-gray-500',
  red:    'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green:  'bg-green-500',
  blue:   'bg-blue-600',
  purple: 'bg-purple-500',
  pink:   'bg-pink-500',
}

export default function TodayPage() {
  const router = useRouter()
  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks()
  const { projects } = useProjects()
  const { habits, logs, loading: habitsLoading, toggleLog } = useHabits()
  const currentUser = useCurrentUser()
  const handleUpdate = useAuditedTaskUpdate(tasks, updateTask, projects, currentUser.assignee)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

  const today = useMemo(() => startOfDay(new Date()), [])
  const todayIso = format(today, 'yyyy-MM-dd')
  const dateLabel = format(today, 'd MMMM, EEEE', { locale: ru })

  // Auto-scope: задачи где я (или loose-personal без ответственного).
  const mine = useMemo(() => (t: Task) => {
    if (t.assignees.length === 0) return t.category === 'personal'
    return !!currentUser.assignee && t.assignees.includes(currentUser.assignee)
  }, [currentUser.assignee])

  const overdueTasks = useMemo(() => {
    return tasks
      .filter(t => t.due_date && t.status !== 'done' && isBefore(parseISO(t.due_date), today) && mine(t))
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  }, [tasks, today, mine])

  const todayTasks = useMemo(() => {
    return tasks
      .filter(t => t.due_date === todayIso && t.status !== 'done' && mine(t))
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
  }, [tasks, todayIso, mine])

  // Приглашения, ожидающие моего ответа (я приглашённый, статус pending).
  const pendingInvites = useMemo(() => {
    if (!currentUser.assignee) return []
    return tasks
      .filter(t =>
        t.invite_status === 'pending' &&
        t.invited_by !== null &&
        t.invited_by !== currentUser.assignee &&
        t.assignees.includes(currentUser.assignee!),
      )
      .sort((a, b) => (a.due_date ?? 'zzzz').localeCompare(b.due_date ?? 'zzzz'))
  }, [tasks, currentUser.assignee])

  // Habits — только свои.
  const myHabits = currentUser.assignee
    ? habits.filter(h => h.assignee === currentUser.assignee)
    : habits
  const doneTodayIds = useMemo(
    () => new Set(logs.filter(l => l.date === todayIso).map(l => l.habit_id)),
    [logs, todayIso],
  )
  const scheduledHabits = myHabits.filter(h => isHabitScheduledOn(h, today))
  const pendingHabits = scheduledHabits.filter(h => !doneTodayIds.has(h.id))
  const doneHabits = scheduledHabits.filter(h => doneTodayIds.has(h.id))

  // Last-completed для тоста «Готово · Отменить». Храним id + старый статус,
  // чтобы можно было откатить. Авто-сброс через 5 секунд.
  const [undoState, setUndoState] = useState<{ id: string; prevStatus: Task['status']; title: string } | null>(null)

  const completeTask = (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    setUndoState({ id, prevStatus: task.status, title: task.title })
    handleUpdate(id, { status: 'done' })
  }
  const undoComplete = () => {
    if (!undoState) return
    handleUpdate(undoState.id, { status: undoState.prevStatus })
    setUndoState(null)
  }
  useEffect(() => {
    if (!undoState) return
    const t = setTimeout(() => setUndoState(null), 5000)
    return () => clearTimeout(t)
  }, [undoState])

  const navigateToProject = (projectId: string) => router.push(`/projects?open=${projectId}`)

  const allClear =
    overdueTasks.length === 0 && todayTasks.length === 0 &&
    scheduledHabits.length === 0 && pendingInvites.length === 0

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Сегодня</h1>
        <p className="mt-1 text-xs capitalize text-gray-400 dark:text-gray-500">{dateLabel}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 pb-16 md:pb-4">
        <div className="mx-auto max-w-2xl">
          {(tasksLoading || habitsLoading) ? (
            <TodaySkeleton />
          ) : allClear ? (
            <EmptyState text="Спокойный день — ничего на сегодня. Можно отдохнуть 🌿" />
          ) : (
            <div className="space-y-6">
              {pendingInvites.length > 0 && (
                <Section title="Ждут твоего ответа" icon="👋" count={pendingInvites.length}>
                  {pendingInvites.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      project={projects.find(p => p.id === task.project_id) ?? null}
                      onOpen={() => setSelectedTask(task)}
                    />
                  ))}
                </Section>
              )}

              {overdueTasks.length > 0 && (
                <Section title="Просрочено" icon="🔥" count={overdueTasks.length} accent>
                  {overdueTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      project={projects.find(p => p.id === task.project_id) ?? null}
                      onOpen={() => setSelectedTask(task)}
                      onComplete={() => completeTask(task.id)}
                    />
                  ))}
                </Section>
              )}

              {todayTasks.length > 0 && (
                <Section title="Задачи на сегодня" icon="⚠️" count={todayTasks.length}>
                  {todayTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      project={projects.find(p => p.id === task.project_id) ?? null}
                      onOpen={() => setSelectedTask(task)}
                      onComplete={() => completeTask(task.id)}
                    />
                  ))}
                </Section>
              )}

              {scheduledHabits.length > 0 && (
                <Section
                  title="Привычки"
                  icon="🔁"
                  count={`${doneHabits.length}/${scheduledHabits.length}`}
                >
                  {pendingHabits.map(h => (
                    <HabitRow
                      key={h.id}
                      habit={h}
                      done={false}
                      onToggle={() => toggleLog(h.id, todayIso)}
                    />
                  ))}
                  {pendingHabits.length === 0 && (
                    <p className="px-1 text-sm text-gray-400">Все привычки на сегодня выполнены 🎉</p>
                  )}
                  {doneHabits.length > 0 && (
                    <>
                      <p className="mt-3 px-1 text-[11px] uppercase tracking-wide text-gray-400">Готово</p>
                      {doneHabits.map(h => (
                        <HabitRow
                          key={h.id}
                          habit={h}
                          done
                          onToggle={() => toggleLog(h.id, todayIso)}
                        />
                      ))}
                    </>
                  )}
                </Section>
              )}
            </div>
          )}
        </div>
      </div>

      <Fab label="Задача" onClick={() => setCreating(true)} />

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          currentUser={currentUser.assignee ?? 'nick'}
          onUpdate={async (id, updates) => {
            const result = await handleUpdate(id, updates)
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null)
            return result
          }}
          onDelete={deleteTask}
          onClose={() => setSelectedTask(null)}
          onProjectOpen={navigateToProject}
        />
      )}

      {creating && (
        <Modal onClose={() => setCreating(false)} title="Новая задача">
          <TaskForm
            initial={{ due_date: todayIso }}
            projects={projects}
            defaultAssignee={currentUser.assignee}
            onSubmit={async (data) => {
              await createTask(data)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
            submitLabel="Создать"
          />
        </Modal>
      )}

      {/* Undo-тост на 5 секунд после завершения задачи через чекбокс */}
      {undoState && (
        <div
          role="status"
          className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900 bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-6"
        >
          <span className="max-w-[200px] truncate">✓ {undoState.title}</span>
          <button
            type="button"
            onClick={undoComplete}
            className="font-medium text-blue-300 hover:underline dark:text-blue-700"
          >
            Отменить
          </button>
        </div>
      )}
    </div>
  )
}

/** Скелет для первой загрузки: 2 секции по 3 строки. */
function TodaySkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map(s => (
        <section key={s}>
          <Skeleton className="mb-2 h-5 w-40 rounded" />
          <div className="space-y-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Section({ title, icon, count, accent, children }: {
  title: string
  icon: string
  count: number | string
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-baseline gap-2 px-1">
        <span aria-hidden>{icon}</span>
        <span className={`text-base font-semibold ${accent ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
          {title}
        </span>
        <span className="text-sm tabular-nums text-gray-400">{count}</span>
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function TaskRow({ task, project, onOpen, onComplete }: {
  task: Task
  project: Project | null
  onOpen: () => void
  /** Опционально: если не передан, кружок завершения не рендерится. Для
   *  pendingInvites чекбокс не нужен — сначала ответ на приглашение. */
  onComplete?: () => void
}) {
  const due = dueStatus(task)
  const dueCls =
    due === 'overdue' ? 'text-red-500 font-medium' :
    due === 'today'   ? 'text-orange-500 font-medium' :
                        'text-gray-400'

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      {onComplete && (
        <button
          onClick={onComplete}
          aria-label="Отметить выполненной"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 text-transparent transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-500 dark:border-gray-600 dark:hover:bg-green-950"
        >
          ✓
        </button>
      )}
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {task.title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
          {project && <span className="truncate">📁 {project.title}</span>}
          {task.due_date && (
            <span className={dueCls}>
              {due && due !== 'future' ? `${dueIcon(due)} ` : '📅 '}{task.due_date}
            </span>
          )}
        </div>
      </button>
      <div className="flex-shrink-0">
        <PriorityBadge priority={task.priority} />
      </div>
    </div>
  )
}

function HabitRow({ habit, done, onToggle }: {
  habit: Habit
  done: boolean
  onToggle: () => void
}) {
  const bg = HABIT_BG[habit.color] ?? HABIT_BG.blue
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
    >
      <span
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm transition-colors ${
          done ? `${bg} text-white shadow-sm` : 'border-2 border-blue-500 text-blue-500'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
          {habit.title}
        </div>
        {habit.description && (
          <div className="truncate text-xs text-gray-400">{habit.description}</div>
        )}
      </div>
    </button>
  )
}
