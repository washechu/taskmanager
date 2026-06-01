import { STATUSES, type Status } from '@/lib/types'

const colorMap: Record<string, string> = {
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-700',
  // Deeper, more saturated yellow so «В процессе» reads distinctly from the
  // pale amber «Средний» priority badge when they appear side by side.
  yellow: 'bg-yellow-200 text-yellow-800',
  green:  'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, color } = STATUSES[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[color]}`}>
      {label}
    </span>
  )
}
