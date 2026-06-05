'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'reset'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Неверный email или пароль')
    } else {
      router.push('/today')
      router.refresh()
    }
    setLoading(false)
  }

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')
    const redirectTo = `${window.location.origin}/auth/reset`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setInfo('Письмо с ссылкой отправлено. Проверь почту (включая папку «Спам»).')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Таски</h1>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            {mode === 'login' ? 'Персональный таск-менеджер' : 'Сброс пароля'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-900">
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="nick@example.com"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Пароль</label>
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(''); setInfo('') }}
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Забыли пароль?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetRequest} className="rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-900">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Введи email — на него придёт ссылка для сброса пароля.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
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
                disabled={loading || !!info}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Отправляем…' : 'Отправить ссылку'}
              </button>

              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setInfo('') }}
                className="text-center text-xs text-gray-500 hover:underline dark:text-gray-400"
              >
                ← Назад ко входу
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
