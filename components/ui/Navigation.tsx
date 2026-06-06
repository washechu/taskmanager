'use client'

import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SegmentedControl } from './SegmentedControl'

interface SubItem {
  view: string
  label: string
  /** Эмодзи-иконка для мобильного таб-бара (`MobileViewTabs`).
   *  На десктопе в сайдбаре показывается только `label`. */
  icon?: string
}

interface NavLink {
  href: string
  label: string
  icon: string
  subs?: SubItem[]
}

const links: NavLink[] = [
  {
    href: '/today',
    label: 'Сегодня',
    icon: '🏠',
  },
  {
    href: '/tasks',
    label: 'Задачи',
    icon: '🎯',
    subs: [
      { view: 'kanban',    label: 'Канбан',    icon: '📋' },
      { view: 'list',      label: 'Список',    icon: '📃' },
      { view: 'calendar',  label: 'Календарь', icon: '📅' },
      { view: 'analytics', label: 'Аналитика', icon: '📊' },
    ],
  },
  {
    href: '/projects',
    label: 'Проекты',
    icon: '📁',
    subs: [
      { view: 'kanban', label: 'Канбан', icon: '📋' },
      { view: 'gantt',  label: 'Гант',   icon: '📈' },
    ],
  },
  {
    href: '/habits',
    label: 'Привычки',
    icon: '🔁',
  },
]

export function Navigation() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const currentView = searchParams.get('view') ?? 'kanban'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-gray-200 md:bg-white md:dark:bg-gray-900 md:dark:border-gray-800">
        <div className="flex h-16 items-center px-6">
          <span className="text-lg font-bold text-gray-900 dark:text-white">Планировщик</span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {links.map(link => {
            const active = pathname.startsWith(link.href)
            return (
              <div key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-base">{link.icon}</span>
                  {link.label}
                </Link>
                {/* Sub-items, shown only when section is active */}
                {active && link.subs && (
                  <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-gray-200 pl-3 dark:border-gray-800">
                    {link.subs.map(sub => {
                      const subActive = currentView === sub.view
                      return (
                        <Link
                          key={sub.view}
                          href={`${link.href}?view=${sub.view}`}
                          className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                            subActive
                              ? 'bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-white'
                              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Выйти
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav (just main sections + view chips above) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-900 md:hidden"
      >
        {links.map(link => {
          const active = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
              style={{ minHeight: 56 }}
            >
              <span className="text-lg leading-none">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

/** Inline view tabs for mobile, rendered inside each page header */
export function MobileViewTabs({
  basePath,
  subs,
}: {
  basePath: string
  subs: SubItem[]
}) {
  const searchParams = useSearchParams()
  const currentView = searchParams.get('view') ?? 'kanban'

  return (
    <SegmentedControl
      variant="view"
      fullWidth
      value={currentView}
      ariaLabel="Переключить вид"
      className="md:hidden"
      options={subs.map(sub => ({
        value: sub.view,
        // На мобиле — эмодзи (короткие, влезают на 360px); fallback на label,
        // если иконка не задана. aria-label держит доступность.
        label: sub.icon
          ? <span className="text-lg leading-none" aria-label={sub.label} title={sub.label}>{sub.icon}</span>
          : sub.label,
        href: `${basePath}?view=${sub.view}`,
      }))}
    />
  )
}
