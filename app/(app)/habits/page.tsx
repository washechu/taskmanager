'use client'

import { useState } from 'react'
import { HabitsWeek } from '@/components/habits/HabitsWeek'
import { HabitModal, HabitForm } from '@/components/habits/HabitModal'
import { Fab } from '@/components/ui/Fab'
import { useHabits } from '@/lib/hooks/useHabits'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { CATEGORIES, ASSIGNEES, type Habit, type Category } from '@/lib/types'

const SELECT_CLASS =
  'h-10 rounded-lg border border-gray-200 bg-white pl-3 text-sm ' +
  'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'

export default function HabitsPage() {
  const { habits, logs, loading, createHabit, updateHabit, deleteHabit, toggleLog } = useHabits()
  const currentUser = useCurrentUser()
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Habit | null>(null)
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [assignee, setAssignee] = useState<string>('all')

  const filtered = habits.filter(h =>
    (category === 'all' || h.category === category) &&
    (assignee === 'all' || h.assignee === assignee)
  )

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Привычки</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Регулярные дела по дням недели — тренировки, занятия, ритуалы.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Категория-вкладки */}
          <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {(['all', 'personal', 'family'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex h-10 items-center px-4 text-sm font-medium transition-colors ${
                  category === c
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {c === 'all' ? 'Все' : CATEGORIES[c].label}
              </button>
            ))}
          </div>
          <select value={assignee} onChange={e => setAssignee(e.target.value)} className={SELECT_CLASS}>
            <option value="all">Все ответственные</option>
            {Object.entries(ASSIGNEES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">Загрузка...</p>
          </div>
        ) : (
          <HabitsWeek
            habits={filtered}
            logs={logs}
            onToggle={toggleLog}
            onOpen={setSelected}
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
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={e => e.target === e.currentTarget && setCreating(false)}
        >
          <div className="w-full max-h-[92vh] overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl dark:bg-gray-900 sm:max-w-md sm:rounded-2xl sm:pb-5">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Новая привычка</h2>
            <HabitForm
              defaultAssignee={currentUser.assignee}
              onSubmit={async (data) => {
                await createHabit(data)
                setCreating(false)
              }}
              onCancel={() => setCreating(false)}
              submitLabel="Создать"
            />
          </div>
        </div>
      )}
    </div>
  )
}
