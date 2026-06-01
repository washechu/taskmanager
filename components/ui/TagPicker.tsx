'use client'

import { useState } from 'react'
import { useTags } from '@/lib/hooks/useTags'
import { TagChip } from './TagChip'
import { TAG_COLORS, type Tag } from '@/lib/types'

interface TagPickerProps {
  selected: string[]
  onChange: (tags: string[]) => void
}

// Solid color samples for the color picker dots
const COLOR_DOT: Record<string, string> = {
  gray:   'bg-gray-400',
  red:    'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-400',
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  purple: 'bg-purple-500',
  pink:   'bg-pink-500',
}

export function TagPicker({ selected, onChange }: TagPickerProps) {
  const { tags, createTag, deleteTag } = useTags()
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('blue')
  const [creating, setCreating] = useState(false)
  const [managing, setManaging] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null)

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter(t => t !== name) : [...selected, name])
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const name = pendingDelete.name
    await deleteTag(pendingDelete.id)
    // Drop it from the current selection too, if present
    if (selected.includes(name)) onChange(selected.filter(t => t !== name))
    setPendingDelete(null)
  }

  const handleAdd = async () => {
    const name = newTagName.trim()
    if (!name) return
    if (tags.some(t => t.name === name)) {
      if (!selected.includes(name)) onChange([...selected, name])
    } else {
      const { data } = await createTag(name, newTagColor)
      if (data) onChange([...selected, data.name])
    }
    setNewTagName('')
    setCreating(false)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && (
          <span className="text-xs text-gray-400">Тегов пока нет — создай первый ниже</span>
        )}
        {tags.map(tag => (
          <TagChip
            key={tag.id}
            name={tag.name}
            color={tag.color}
            selected={!managing && selected.includes(tag.name)}
            onClick={managing ? undefined : () => toggle(tag.name)}
            onRemove={managing ? () => setPendingDelete(tag) : undefined}
          />
        ))}
      </div>

      {/* Delete confirmation */}
      {pendingDelete && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-xs text-red-700 dark:text-red-300">
            Удалить тег «{pendingDelete.name}»? Он исчезнет у всех задач.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Удалить
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-md px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {!creating ? (
        <div className="mt-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => { setCreating(true); setManaging(false); setPendingDelete(null) }}
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            + Добавить тег
          </button>
          {tags.length > 0 && (
            <button
              type="button"
              onClick={() => { setManaging(m => !m); setPendingDelete(null) }}
              className="text-xs text-gray-500 hover:underline dark:text-gray-400"
            >
              {managing ? 'Готово' : 'Изменить'}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              autoFocus
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
                if (e.key === 'Escape') { e.preventDefault(); setCreating(false); setNewTagName('') }
              }}
              placeholder="Название тега"
              className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newTagName.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Создать
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewTagName('') }}
              className="rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              ✕
            </button>
          </div>
          {/* Color picker — just circles */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">Цвет:</span>
            <div className="flex gap-1.5">
              {Object.entries(TAG_COLORS).map(([key]) => {
                const active = newTagColor === key
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setNewTagColor(key)}
                    className={`h-5 w-5 rounded-full ${COLOR_DOT[key]} transition-transform ${
                      active
                        ? 'ring-2 ring-offset-2 ring-blue-500 ring-offset-white dark:ring-offset-gray-900 scale-110'
                        : 'hover:scale-110'
                    }`}
                    title={TAG_COLORS[key].label}
                    aria-label={TAG_COLORS[key].label}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
