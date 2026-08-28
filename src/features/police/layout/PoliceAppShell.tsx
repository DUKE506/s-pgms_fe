import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ClipboardList, History, LayoutDashboard, UserSearch } from 'lucide-react'
import Sidebar, { type SidebarNavItem } from '@/shared/components/Sidebar'
import MobileHeader from '@/shared/components/MobileHeader'
import { useAuthStore, type Role } from '@/features/auth/store/authStore'

const NAV_BY_ROLE: Partial<Record<Role, SidebarNavItem[]>> = {
  본청: [
    { icon: LayoutDashboard, label: '현황', href: '/dashboard' },
    { icon: History, label: '이력', href: '/history' },
  ],
  지역청: [
    { icon: LayoutDashboard, label: '현황', href: '/dashboard' },
    { icon: History, label: '이력', href: '/history' },
  ],
  경찰서: [
    { icon: LayoutDashboard, label: '현황', href: '/dashboard' },
    { icon: ClipboardList, label: '경호목록', href: '/security-cases' },
    { icon: History, label: '이력', href: '/history' },
    { icon: UserSearch, label: '게스트', href: '/guests' },
  ],
  게스트: [{ icon: ClipboardList, label: '경호목록', href: '/security-cases' }],
}

const ROLE_LABEL: Partial<Record<Role, string>> = {
  본청: '본청',
  지역청: '지역청',
  경찰서: '피전',
  게스트: '게스트',
}

interface PoliceAppShellProps {
  children: ReactNode
}

function PoliceAppShell({ children }: PoliceAppShellProps) {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  const items = (user && NAV_BY_ROLE[user.role]) ?? []
  const userLabel = (user && ROLE_LABEL[user.role]) ?? ''

  function handleLogout() {
    useAuthStore.getState().logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar items={items} logoLabel="PGMS" userLabel={userLabel} onLogout={handleLogout} />
      <div className="min-w-0 flex-1">
        <MobileHeader userLabel={userLabel} onLogout={handleLogout} />
        {children}
      </div>
    </div>
  )
}

export default PoliceAppShell
