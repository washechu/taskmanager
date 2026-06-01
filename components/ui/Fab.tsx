'use client'

interface FabProps {
  /** Visible label next to the + sign (e.g. "Задача", "Проект") */
  label: string
  onClick: () => void
}

/**
 * Floating Action Button — extended (pill with label). Fixed to the
 * bottom-right corner, floats above page content. On mobile it sits
 * above the bottom nav (+ iOS safe-area); on desktop it docks to the
 * bottom-right of the viewport. Sits below modals (z-40).
 */
export function Fab({ label, onClick }: FabProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`Создать: ${label}`}
      className="fixed right-5 z-30 flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-4 font-medium text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 active:scale-95 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-6 md:right-6 md:py-3"
    >
      <span className="text-xl leading-none">+</span>
      <span className="text-sm">{label}</span>
    </button>
  )
}
