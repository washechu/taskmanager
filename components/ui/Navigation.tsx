'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const links = [
  { href: '/tasks',    label: 'Задачи',   icon: '✅' },
  { href: '/projects', label: 'Проекты',  icon: '📁' },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-gray-200 md:bg-white md:dark:bg-gray-900 md:dark:border-gray-800">
        <div className="flex h-16 items-center px-6">
          <span className="text-lg font-bold text-gray-900 dark:text-white">Таски</span>
        </div>
        <div className="flex flex-1 flex-col gap-1 px-3 py-2">
          {links.map(link => {
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            )
          })}
        </div>
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Выйти
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:hidden">
        {links.map(link => {
          const active = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                active
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              style={{ minHeight: 56 }}
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
