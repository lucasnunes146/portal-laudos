'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { Sidebar } from '@/components/layout/Sidebar'
import { authApi } from '@/lib/api'
import { clearTokens } from '@/lib/auth'
import { User } from '@/lib/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const token = Cookies.get('access_token')
    if (!token) {
      router.replace('/login')
      return
    }
    authApi.me()
      .then(res => {
        const u = res.data as User
        if (u.role === 'patient') {
          router.replace('/portal')
          return
        }
        setUser(u)
      })
      .catch(() => {
        clearTokens()
        router.replace('/login')
      })
  }, [router])

  const handleLogout = async () => {
    const refresh = Cookies.get('refresh_token') || ''
    try { await authApi.logout(refresh) } catch {}
    clearTokens()
    router.push('/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
