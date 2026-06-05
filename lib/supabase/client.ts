import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      auth: {
        // Implicit flow для recovery-писем: hash-токены (#access_token=...)
        // работают cross-device. PKCE требовал бы тот же браузер где была
        // инициирована «Забыли пароль», что ломало восстановление пароля
        // когда одно устройство запрашивает, другое получает письмо.
        // Для нашего сценария (2 пользователя, нет OAuth) implicit безопасен.
        flowType: 'implicit',
      },
    },
  )
}
