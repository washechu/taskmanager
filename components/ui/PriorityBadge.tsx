import { PRIORITIES, type Priority } from '@/lib/types'

const colorMap: Record<string, string> = {
  red:    'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  green:  'bg-green-100 text-green-700',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, color } = PRIORITIES[priority]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[color]}`}>
      {label}
    </span>
  )
}
