import { TAG_COLORS, type Tag } from '@/lib/types'

interface TagChipProps {
  name: string
  color?: string
  tags?: Tag[]
  size?: 'xs' | 'sm'
  selected?: boolean
  onClick?: () => void
  onRemove?: () => void
}

/**
 * Renders a colored tag chip. If `color` is not provided, looks up the
 * color from the `tags` array by name (so consumers can just pass the
 * name string for tags stored on tasks).
 */
export function TagChip({ name, color, tags, size = 'xs', selected, onClick, onRemove }: TagChipProps) {
  const resolvedColor = color ?? tags?.find(t => t.name === name)?.color ?? 'gray'
  const c = TAG_COLORS[resolvedColor] ?? TAG_COLORS.gray
  const sizeClass = size === 'xs' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'

  const className = `inline-flex items-center gap-1 rounded-full ${sizeClass} ${c.bg} ${c.text} ${
    selected ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-gray-900' : ''
  } ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`

  return (
    <span className={className} onClick={onClick}>
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 text-current opacity-60 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </span>
  )
}
