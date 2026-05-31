interface EmptyStateProps {
  text: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <p className="text-sm text-gray-500">{text}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
