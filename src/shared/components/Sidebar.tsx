import { Link, useLocation } from 'react-router'
import { LogOut, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SidebarNavItem {
  icon: LucideIcon
  label: string
  href: string
}

interface SidebarProps {
  items: SidebarNavItem[]
  logoLabel: string
  userLabel: string
  onLogout: () => void
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

// 데스크톱(xl 이상): 좌측 고정 세로 rail. 그 아래(xl 미만)는 전부 모바일 취급 —
// 하단 플로팅 pill 아이콘 바. 목업 사이드바 패턴을 그대로 반영.
function Sidebar({ items, logoLabel, userLabel, onLogout }: SidebarProps) {
  const { pathname } = useLocation()

  return (
    <>
      <aside className="hidden xl:sticky xl:top-0 xl:flex h-screen w-[76px] shrink-0 flex-col items-center gap-1.5 bg-sidebar py-5">
        <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#edf4ff] to-[#b3cfff] text-[13px] font-bold text-sidebar-primary-foreground">
          {logoLabel}
        </div>

        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex w-[60px] flex-col items-center gap-1 rounded-[10px] py-2.5 text-[10px] font-medium',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              )}
            >
              <item.icon size={20} strokeWidth={1.8} />
              {item.label}
            </Link>
          )
        })}

        <div className="flex-1" />

        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-[11px] font-semibold text-white">
          {userLabel}
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-[60px] flex-col items-center gap-1 py-2.5 text-sidebar-foreground hover:text-sidebar-accent-foreground"
          aria-label="로그아웃"
        >
          <LogOut size={18} strokeWidth={1.8} />
        </button>
      </aside>

      <nav className="xl:hidden fixed bottom-[18px] left-1/2 -translate-x-1/2 flex gap-8 rounded-full bg-sidebar px-8 py-3 shadow-lg">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              aria-label={item.label}
              className={active ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/60'}
            >
              <item.icon size={20} strokeWidth={1.8} />
            </Link>
          )
        })}
      </nav>
    </>
  )
}

export default Sidebar
