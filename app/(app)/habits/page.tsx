'use client'

import { useState } from 'react'
import { HabitsView } from '@/components/habits/HabitsView'
import { HabitModal, HabitForm } from '@/components/habits/HabitModal'
import { Fab } from '@/components/ui/Fab'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useHabits } from '@/lib/hooks/useHabits'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { isoWeekday, type Habit } from '@/lib/types'

export default function HabitsPage() {
  const { habits, logs, loading, createHabit, updateHabit, deleteHabit, toggleLog } = useHabits()
  const currentUser = useCurrentUser()
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Habit | null>(null)
  const [scope, setScope] = useState<'all' | 'today'>('all')

  // Показываем только привычки текущего пользователя (чужие смотреть незачем).
  // Если пользователь не распознан (email не совпал) — показываем все, чтобы не было пусто.
  const mine = currentUser.assignee
    ? habits.filter(h => h.assignee === currentUser.assignee)
    : habits

  // «Сегодня» — только те, у кого сегодняшний день в расписании.
  const todayIso = isoWeekday(new Date())
  const filtered = scope === 'today' ? mine.filter(h => h.weekdays.includes(todayIso)) : mine

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
          <SegmentedControl
            variant="filter"
            value={scope}
            onChange={setScope}
            ariaLabel="Какие привычки показывать"
            options={[
              { value: 'all',   label: 'Все привычки' },
              { value: 'today', label: 'Сегодня'      },
            ] as const}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pb-[calc(140px+env(safe-area-inset-bottom))] md:pb-24">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Загрузка...</p>
          </div>
        ) : (
          <HabitsView
            habits={filtered}
            logs={logs}
            onToggle={toggleLog}
            onOpen={setSelected}
            emptyText={scope === 'today' ? 'На сегодня привычек по расписанию нет' : undefined}
          />
        )}
      </div>

      <Fab label="Привычка" onClick={() => setCreating(true)} />

      {selected && (
        <HabitModal
          habit={selected}
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
