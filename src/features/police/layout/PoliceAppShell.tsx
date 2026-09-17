import type { ReactNode } from 'react'
import { ClipboardList, History, LayoutDashboard, UserCog } from 'lucide-react'
import Sidebar, { type SidebarNavItem } from '@/shared/components/Sidebar'
import { useAuthStore, type Role } from '@/features/auth/store/authStore'
import { useLogout } from '@/features/auth/lib/useLogout'

const NAV_BY_ROLE: Partial<Record<Role, SidebarNavItem[]>> = {
  본청: [
    { icon: LayoutDashboard, label: '현황', href: '/dashboard' },
    { icon: History, label: '이력', href: '/history' },
    { icon: UserCog, label: '계정', href: '/accounts' },
  ],
  지역청: [
    { icon: LayoutDashboard, label: '현황', href: '/dashboard' },
    { icon: History, label: '이력', href: '/history' },
    { icon: UserCog, label: '계정', href: '/accounts' },
  ],
  경찰서: [
    { icon: LayoutDashboard, label: '현황', href: '/dashboard' },
    { icon: ClipboardList, label: '경호목록', href: '/security-cases' },
    { icon: History, label: '이력', href: '/history' },
    { icon: UserCog, label: '계정', href: '/guests' },
  ],
  게스트: [{ icon: ClipboardList, label: '경호목록', href: '/security-cases' }],
}

interface PoliceAppShellProps {
  children: ReactNode
}

function PoliceAppShell({ children }: PoliceAppShellProps) {
  const user = useAuthStore((state) => state.user)
  const handleLogout = useLogout()

  const items = (user && NAV_BY_ROLE[user.role]) ?? []

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} logoLabel="Safety Link" onLogout={handleLogout} settingsHref="/settings" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export default PoliceAppShell
