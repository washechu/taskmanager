'use client'

import { useState } from 'react'
import { useComments } from '@/lib/hooks/useComments'
import { ASSIGNEES, type Assignee } from '@/lib/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface CommentSectionProps {
  taskId: string
  currentUser: Assignee
}

export function CommentSection({ taskId, currentUser }: CommentSectionProps) {
  const { comments, loading, addComment, deleteComment } = useComments(taskId)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    await addComment(text.trim(), currentUser)
    setText('')
    setSubmitting(false)
  }

  return (
    <div className="mt-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        Комментарии {comments.length > 0 && `(${comments.length})`}
      </h4>

      {loading ? (
        <p className="text-xs text-gray-400">Загрузка...</p>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-2">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {comment.author === 'nick' ? 'Н' : 'Г'}
              </div>
              <div className="flex-1 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {ASSIGNEES[comment.author].label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {format(new Date(comment.created_at), 'd MMM HH:mm', { locale: ru })}
                    </span>
                    {comment.author === currentUser && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="text-xs text-gray-300 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                  {comment.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Написать комментарий..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          →
        </button>
      </form>
    </div>
  )
}
