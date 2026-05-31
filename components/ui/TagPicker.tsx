'use client'

import { useState } from 'react'
import { useTags } from '@/lib/hooks/useTags'
import { TagChip } from './TagChip'
import { TAG_COLORS } from '@/lib/types'

interface TagPickerProps {
  selected: string[]
  onChange: (tags: string[]) => void
}

export function TagPicker({ selected, onChange }: TagPickerProps) {
  const { tags, createTag } = useTags()
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('blue')
  const [creating, setCreating] = useState(false)

  const toggle = (name: string) => {
    onChange(selected.includes(name) ? selected.filter(t => t !== name) : [...selected, name])
  }

  const handleAdd = async () => {
    const name = newTagName.trim()
    if (!name) return
    if (tags.some(t => t.name === name)) {
      // tag exists — just select it
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
            selected={selected.includes(tag.name)}
            onClick={() => toggle(tag.name)}
          />
        ))}
      </div>

      {/* Add custom tag */}
      {!creating ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          + Добавить тег
        </button>
      ) : (
        <div className="mt-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
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
          {/* Color picker */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(TAG_COLORS).map(([key, c]) => (
              <button
                type="button"
                key={key}
                onClick={() => setNewTagColor(key)}
                className={`rounded-full px-2 py-0.5 text-xs ${c.bg} ${c.text} ${
                  newTagColor === key ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-900' : ''
                }`}
                title={c.label}
              >
                {newTagName.trim() || 'пример'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
