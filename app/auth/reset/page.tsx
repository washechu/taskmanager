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
 * Логика установки сессии:
 *   • supabase-js при создании клиента сам разбирает hash-токены из URL
 *     (`#access_token=...&type=recovery`) и эмитит событие PASSWORD_RECOVERY
 *   • PKCE-флоу: если в URL есть `?code=`, дополнительно зовём
 *     exchangeCodeForSession; SIGNED_IN-событие приедет когда успешно
 *
 * Слушаем onAuthStateChange — это надёжнее чем сразу опрашивать getSession
 * (асинхронная обработка hash может ещё не завершиться к моменту useEffect).
 * После 5 секунд без события считаем ссылку битой.
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
  const [phase, setPhase] = useState<'waiting' | 'ready' | 'expired'>('waiting')

  useEffect(() => {
    let mounted = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const markReady = () => {
      if (!mounted) return
      setPhase('ready')
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    }

    // 1. Подписка на изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        markReady()
      }
    })

    // 2. Если код прилетел через PKCE, обмениваем — это триггернёт SIGNED_IN
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!mounted) return
        if (error) {
          // Не критично — может уже обменян supabase-js'ом автоматически
          // Подождём onAuthStateChange или timeout
        }
      })
    }

    // 3. На всякий случай проверим, не была ли сессия установлена раньше
    //    (например, пользователь уже был залогинен и тут recovery поверх)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session) markReady()
    })

    // 4. Если за 5 секунд ничего не произошло — считаем ссылку битой
    timeoutId = setTimeout(() => {
      if (!mounted) return
      if (phase === 'waiting') {
        setError('Ссылка недействительна или истекла. Попроси новое письмо со страницы входа.')
        setPhase('expired')
      }
    }, 5000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (timeoutId) clearTimeout(timeoutId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Планировщик</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Установи новый пароль
          </p>
        </div>

        {phase === 'waiting' ? (
          <p className="text-center text-sm text-gray-400">Проверяем ссылку…</p>
        ) : phase === 'expired' ? (
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
