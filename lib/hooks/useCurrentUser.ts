'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Assignee } from '@/lib/types'

const NICK_EMAIL  = (process.env.NEXT_PUBLIC_NICK_EMAIL  ?? '').toLowerCase()
const GALYA_EMAIL = (process.env.NEXT_PUBLIC_GALYA_EMAIL ?? '').toLowerCase()

export interface CurrentUser {
  assignee: Assignee | null
  email: string | null
  loading: boolean
}

export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({ assignee: null, email: null, loading: true })

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const resolve = (email: string | null) => {
      if (cancelled) return
      const lower = email?.toLowerCase() ?? null
      let assignee: Assignee | null = null
      if (lower === NICK_EMAIL)  assignee = 'nick'
      if (lower === GALYA_EMAIL) assignee = 'galya'
      setState({ assignee, email: lower, loading: false })
    }

    supabase.auth.getUser().then(({ data: { user } }) => resolve(user?.email ?? null))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      resolve(session?.user.email ?? null)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}
