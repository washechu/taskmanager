'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Страница сброса пароля. Пользователь попадает сюда по ссылке из
 * recovery-письма, которое Supabase отправляет через
 * supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset' }).
 *
 * Supabase-js при загрузке клиента автоматически обработает hash-токены
 * (`#access_token=...&type=recovery`) и установит сессию. Дальше мы просто
 * предлагаем ввести новый пароль и вызываем supabase.auth.updateUser.
 *
 * Если сессии нет (ссылка истекла, или открыта прямо без recovery-флоу) —
 * показываем сообщение и предлагаем запросить новую ссылку.
 */
function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [sessionOk, setSessionOk] = useState(false)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      // Сначала пытаемся обменять PKCE-код, если он в URL.
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!mounted) return
        if (error) {
          setError('Ссылка недействительна или истекла. Попроси новое письмо.')
          setReady(true)
          return
        }
      }

      // Hash-токены (#access_token=...) обрабатываются supabase-js
      // автоматически при создании клиента — просто проверим, есть ли сессия.
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session) {
        setError('Сессия не найдена. Открой ссылку из письма заново или попроси новую.')
      } else {
        setSessionOk(true)
      }
      setReady(true)
    }
    init()
    return () => { mounted = false }
  }, [searchParams, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (password.length < 6) {
      setError('Минимум 6 символов')
      return
    }
    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setInfo('Пароль обновлён. Перенаправляем…')
    setTimeout(() => {
      router.push('/today')
      router.refresh()
    }, 800)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Новый пароль</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Установи пароль для доступа к Таскам
          </p>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-gray-400">Проверяем ссылку…</p>
        ) : !sessionOk ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-900">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              На страницу входа
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-900">
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">Новый пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">Повтори пароль</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>
              )}
              {info && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">{info}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-gray-400">Загрузка…</div>}>
      <ResetPasswordInner />
    </Suspense>
  )
}
