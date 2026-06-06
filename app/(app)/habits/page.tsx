'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { HabitsView } from '@/components/habits/HabitsView'
import { HabitModal, HabitForm } from '@/components/habits/HabitModal'
import { HabitAnalytics } from '@/components/habits/HabitAnalytics'
import { Fab } from '@/components/ui/Fab'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/Skeleton'
import { MobileViewTabs } from '@/components/ui/Navigation'
import { useHabits } from '@/lib/hooks/useHabits'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { isHabitScheduledOn, type Habit } from '@/lib/types'

type Scope = 'today' | 'done' | 'all'
type View  = 'list' | 'analytics'

function HabitsPageInner() {
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') ?? 'list') as View

  const { habits, logs, loading, createHabit, updateHabit, deleteHabit, toggleLog } = useHabits()
  const currentUser = useCurrentUser()
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Habit | null>(null)
  const [scope, setScope] = useState<Scope>('today')

  // Показываем только привычки текущего пользователя (чужие смотреть незачем).
  // Если пользователь не распознан (email не совпал) — показываем все, чтобы не было пусто.
  const mine = currentUser.assignee
    ? habits.filter(h => h.assignee === currentUser.assignee)
    : habits

  const todayDate = format(new Date(), 'yyyy-MM-dd')
  const today = new Date()
  const doneTodayIds = new Set(logs.filter(l => l.date === todayDate).map(l => l.habit_id))

  const scheduledToday = mine.filter(h => isHabitScheduledOn(h, today))
  const filtered =
    scope === 'all'   ? mine :
    scope === 'done'  ? scheduledToday.filter(h => doneTodayIds.has(h.id)) :
                        scheduledToday.filter(h => !doneTodayIds.has(h.id)) // 'today'

  // Контекстные пустые состояния по вкладкам
  const emptyText =
    scope === 'all'  ? undefined :
    scope === 'done' ? 'Сегодня пока ничего не отмечено' :
    scheduledToday.length === 0 ? 'На сегодня привычек по расписанию нет' :
                                  'Все привычки на сегодня выполнены 🎉'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Привычки</h1>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Регулярные дела по дням недели — тренировки, занятия, ритуалы.
          </p>
        </div>

        <div className="mt-4">
          <MobileViewTabs basePath="/habits" subs={[
            { view: 'list',      label: 'Список',    icon: '📃' },
            { view: 'analytics', label: 'Аналитика', icon: '📊' },
          ]} />
        </div>

        {/* Scope-фильтр живёт только в Списке. В Аналитике у нас свой период. */}
        {view === 'list' && (
          <div className="mt-3">
            <SegmentedControl
              variant="filter"
              value={scope}
              onChange={setScope}
              ariaLabel="Какие привычки показывать"
              options={[
                { value: 'today', label: 'Сегодня' },
                { value: 'done',  label: 'Готово'  },
                { value: 'all',   label: 'Все'     },
              ] as const}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 pb-[calc(140px+env(safe-area-inset-bottom))] md:pb-24">
        {loading ? (
          <div className="mx-auto max-w-2xl space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-3 flex-shrink-0 rounded-full" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                </div>
                <div className="mt-3 flex gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map(d => (
                    <Skeleton key={d} className="h-8 w-8 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : view === 'analytics' ? (
          <HabitAnalytics
            habits={mine}
            logs={logs}
            onHabitOpen={setSelected}
          />
        ) : (
          <HabitsView
            habits={filtered}
            logs={logs}
            onToggle={toggleLog}
            onOpen={setSelected}
            emptyText={emptyText}
          />
        )}
      </div>

      <Fab label="Привычка" onClick={() => setCreating(true)} />

      {selected && (
        <HabitModal
          habit={selected}
          logs={logs}
          onUpdate={async (id, updates) => {
            const result = await updateHabit(id, updates)
            setSelected(prev => prev ? { ...prev, ...updates } : null)
            return result
          }}
          onDelete={deleteHabit}
          onClose={() => setSelected(null)}
        />
      )}

      {creating && (
        <Modal onClose={() => setCreating(false)} title="Новая привычка" size="md">
          <HabitForm
            defaultAssignee={currentUser.assignee}
            onSubmit={async (data) => {
              await createHabit(data)
              setCreating(false)
            }}
            onCancel={() => setCreating(false)}
            submitLabel="Создать"
          />
        </Modal>
      )}
    </div>
  )
}

export default function HabitsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Загрузка...</div>}>
      <HabitsPageInner />
    </Suspense>
  )
}
