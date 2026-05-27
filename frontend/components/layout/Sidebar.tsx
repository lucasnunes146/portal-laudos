'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Shield, Settings, LogOut, Activity
} from 'lucide-react'
import { clsx } from 'clsx'
import { User } from '@/lib/types'
import { canViewAuditLogs } from '@/lib/auth'

interface SidebarProps {
  user: User
  onLogout: () => void
}

const navItems = (user: User) => {
  const items = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'secretary', 'doctor'] },
    { href: '/patients', label: 'Pacientes', icon: Users, roles: ['admin', 'secretary', 'doctor'] },
    { href: '/reports', label: 'Laudos', icon: FileText, roles: ['admin', 'secretary', 'doctor'] },
    { href: '/audit', label: 'Auditoria', icon: Shield, roles: ['admin', 'doctor'] },
    { href: '/settings', label: 'Configurações', icon: Settings, roles: ['admin'] },
  ]
  return items.filter(item => item.roles.includes(user.role))
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity size={16} />
          </div>
          <div>
            <p className="font-semibold text-sm">Portal de Laudos</p>
            <p className="text-xs text-gray-400">{user.clinic_name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems(user).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold">
            {user.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.full_name}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  )
}
