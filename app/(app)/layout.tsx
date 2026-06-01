export const dynamic = 'force-dynamic'

import { Navigation } from '@/components/ui/Navigation'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Navigation />
      <main className="flex-1 overflow-hidden pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
