'use client'

import { useState } from 'react'
import { useComments } from '@/lib/hooks/useComments'
import { ASSIGNEES, type Assignee } from '@/lib/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
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

  const userCount = comments.filter(c => c.kind === 'user').length

  return (
    <div className="mt-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        Комментарии {userCount > 0 && `(${userCount})`}
      </h4>

      {loading ? (
        <p className="text-xs text-gray-400">Загрузка...</p>
      ) : (
        <div className="space-y-2">
          {comments.map(comment => {
            const isAudit = comment.kind === 'audit'

            if (isAudit) {
              return (
                <div
                  key={comment.id}
                  className="flex items-start gap-2 pl-9 text-xs italic text-gray-400 dark:text-gray-500"
                >
                  <span className="opacity-50">⤷</span>
                  <span className="flex-1">
                    <b className="font-medium not-italic">
                      {ASSIGNEES[comment.author].label}
                    </b>{' '}
                    {comment.text}
                    <span className="ml-1 not-italic opacity-70">
                      · {format(new Date(comment.created_at), 'd MMM HH:mm', { locale: ru })}
                    </span>
                  </span>
                </div>
              )
            }

            return (
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
            )
          })}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Написать комментарий..."
        />
        <Button type="submit" disabled={!text.trim() || submitting} className="flex-shrink-0">→</Button>
      </form>
    </div>
  )
}
