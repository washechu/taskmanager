'use client'

import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <Modal
      onClose={onCancel}
      title={title}
      size="sm"
      layer="confirm"
      dismissable={false}
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}
