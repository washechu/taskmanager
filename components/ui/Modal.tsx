'use client'

import { useEffect, type ReactNode } from 'react'
import { IconButton } from './IconButton'

interface ModalProps {
  onClose: () => void
  /** Заголовок в bordered-хедере. Если не задан — хедер не рендерится. */
  title?: ReactNode
  /** Слот слева от ✕ для дополнительных action-кнопок (✏️ 🗑️ и т.п.). */
  headerActions?: ReactNode
  /** Ширина: sm = max-w-sm, md = max-w-md, lg = max-w-lg (по умолчанию). */
  size?: 'sm' | 'md' | 'lg'
  /** Слой: 'modal' (z-40, по умолчанию) или 'confirm' (z-50, поверх обычной модалки). */
  layer?: 'modal' | 'confirm'
  /** Закрытие по тапу на backdrop + ESC + кнопке ✕. Default true. ConfirmModal — false. */
  dismissable?: boolean
  children: ReactNode
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
}

/**
 * Единый шелл всех диалогов. На мобиле — bottom-sheet (`items-end`, скруглён
 * только сверху), на десктопе — центрированная панель. Тело имеет нижний
 * safe-area паддинг, чтобы контент не уходил под home-indicator.
 */
export function Modal({
  onClose,
  title,
  headerActions,
  size = 'lg',
  layer = 'modal',
  dismissable = true,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!dismissable) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, dismissable])

  const z = layer === 'confirm' ? 'z-50' : 'z-40'

  return (
    <div
      className={`fixed inset-0 ${z} flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4`}
      onClick={e => dismissable && e.target === e.currentTarget && onClose()}
    >
      <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 ${SIZE[size]} sm:rounded-2xl`}>
        {title !== undefined && (
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="flex min-w-0 items-center gap-2 truncate text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <div className="flex flex-shrink-0 items-center gap-1">
              {headerActions}
              {dismissable && (
                <IconButton onClick={onClose} aria-label="Закрыть" size="sm">✕</IconButton>
              )}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  )
}
