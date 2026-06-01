import { PRIORITIES, type Priority } from '@/lib/types'

const styleMap: Record<Priority, { bg: string; text: string; dot: string }> = {
  high: {
    bg:   'bg-red-100 dark:bg-red-950/60',
    text: 'text-red-700 dark:text-red-300',
    dot:  'bg-red-500',
  },
  medium: {
    bg:   'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    dot:  'bg-amber-500',
  },
  low: {
    bg:   'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot:  'bg-emerald-500',
  },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label } = PRIORITIES[priority]
  const s = styleMap[priority]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  )
}
