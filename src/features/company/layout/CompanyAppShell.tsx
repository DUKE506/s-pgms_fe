import type { ReactNode } from 'react'
import { ClipboardList, History, LayoutDashboard, UserCog, Users } from 'lucide-react'
import Sidebar, { type SidebarNavItem } from '@/shared/components/Sidebar'
import { useLogout } from '@/features/auth/lib/useLogout'

// 관리자 계정 관리(Phase 3.6 항목2)는 본부관리자도 전체 목록을 조회할 수
// 있어야 한다고 재확정(2026-08-31)돼 역할 구분 없이 전체 본사 계정에
// 노출한다.
const NAV_ITEMS: SidebarNavItem[] = [
  { icon: LayoutDashboard, label: '대시보드', href: '/admin/dashboard' },
  { icon: ClipboardList, label: '경호관리', href: '/admin/security-cases' },
  { icon: History, label: '이력', href: '/admin/history' },
  { icon: Users, label: '근무자', href: '/admin/workers' },
  { icon: UserCog, label: '관리자', href: '/admin/managers' },
]

interface CompanyAppShellProps {
  children: ReactNode
}

function CompanyAppShell({ children }: CompanyAppShellProps) {
  const handleLogout = useLogout()

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={NAV_ITEMS}
        logoLabel="Safety Link"
        onLogout={handleLogout}
        settingsHref="/admin/settings"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export default CompanyAppShell
