'use client'

import { ASSIGNEES, type Assignee } from '@/lib/types'

interface AssigneePickerProps {
  value: Assignee[]
  onChange: (next: Assignee[]) => void
  invalid?: boolean
}

/**
 * Чип-тогглер ответственных. Множественный выбор: можно отметить обоих,
 * одного или никого. Семантика «оба» = задача/проект общий и виден
 * у каждого из выбранных в его «Личное».
 */
export function AssigneePicker({ value, onChange, invalid }: AssigneePickerProps) {
  const toggle = (a: Assignee) => {
    onChange(value.includes(a) ? value.filter(x => x !== a) : [...value, a])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(['nick', 'galya'] as Assignee[]).map(a => {
        const active = value.includes(a)
        const inactiveBorder = invalid
          ? 'border-red-400 dark:border-red-500'
          : 'border-gray-200 dark:border-gray-700'
        return (
          <button
            key={a}
            type="button"
            onClick={() => toggle(a)}
            aria-pressed={active}
            className={`flex h-10 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium transition-colors ${
              active
                ? 'border-blue-600 bg-blue-600 text-white'
                : `${inactiveBorder} text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800`
            }`}
          >
            <span aria-hidden className="text-xs">{active ? '✓' : '+'}</span>
            {ASSIGNEES[a].label}
          </button>
        )
      })}
    </div>
  )
}
