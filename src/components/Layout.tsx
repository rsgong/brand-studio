import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/auth'
import { Image, Clock, BookOpen, Settings, Users, LogOut } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Gallery', icon: Image },
  { to: '/history', label: 'History', icon: Clock },
  { to: '/guide', label: 'Guide', icon: BookOpen },
  { to: '/shot-types', label: 'Shot Types', icon: Settings },
  { to: '/users', label: 'Users', icon: Users },
]

export function Layout({ children }: PropsWithChildren) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-semibold tracking-tight">Fresh Context Brand Studio</h1>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm text-gray-600">{user.user_metadata?.full_name ?? user.email}</span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="px-6 py-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}
