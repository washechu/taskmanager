import { STATUSES, type Status } from '@/lib/types'

// Deeper, more saturated yellow so «В процессе» reads distinctly from the
// pale amber «Средний» priority badge when they appear side by side.
const colorMap: Record<string, string> = {
  gray:   'bg-gray-100   text-gray-600   dark:bg-gray-800       dark:text-gray-300',
  blue:   'bg-blue-100   text-blue-700   dark:bg-blue-950       dark:text-blue-300',
  yellow: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/70  dark:text-yellow-200',
  green:  'bg-green-100  text-green-700  dark:bg-green-950      dark:text-green-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950     dark:text-orange-300',
  // slate — для cancelled. Зачёркнутый текст подчёркивает «вычеркнуто».
  slate:  'bg-slate-100  text-slate-500  line-through dark:bg-slate-800  dark:text-slate-400',
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, color } = STATUSES[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[color]}`}>
      {label}
    </span>
  )
}
