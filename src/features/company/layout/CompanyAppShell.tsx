import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ClipboardList, History, LayoutDashboard, Users } from 'lucide-react'
import Sidebar, { type SidebarNavItem } from '@/shared/components/Sidebar'
import MobileHeader from '@/shared/components/MobileHeader'
import { useAuthStore } from '@/features/auth/store/authStore'

const NAV_ITEMS: SidebarNavItem[] = [
  { icon: LayoutDashboard, label: '대시보드', href: '/admin/dashboard' },
  { icon: ClipboardList, label: '경호관리', href: '/admin/security-cases' },
  { icon: Users, label: '근무자', href: '/admin/workers' },
  { icon: History, label: '이력', href: '/admin/history' },
]

interface CompanyAppShellProps {
  children: ReactNode
}

function CompanyAppShell({ children }: CompanyAppShellProps) {
  const navigate = useNavigate()

  function handleLogout() {
    useAuthStore.getState().logout()
    navigate('/admin')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar items={NAV_ITEMS} logoLabel="PGMS" userLabel="본사" onLogout={handleLogout} />
      <div className="min-w-0 flex-1">
        <MobileHeader userLabel="본사" onLogout={handleLogout} />
        {children}
      </div>
    </div>
  )
}

export default CompanyAppShell
