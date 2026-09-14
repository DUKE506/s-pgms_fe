import { Link, useLocation } from 'react-router'
import { Link2, LogOut, Settings, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SidebarNavItem {
  icon: LucideIcon
  label: string
  href: string
}

interface SidebarProps {
  items: SidebarNavItem[]
  logoLabel: string
  onLogout: () => void
  // 모바일 하단 nav 설정 아이콘이 이동할 경로 — 경찰("/settings")/본사
  // ("/admin/settings")가 서로 달라 AppShell에서 넘겨받는다.
  settingsHref: string
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

// 데스크톱(xl 이상): 좌측 고정 세로 rail. 그 아래(xl 미만)는 전부 모바일 취급 —
// 하단 플로팅 pill 아이콘 바. 목업 사이드바 패턴을 그대로 반영.
function Sidebar({ items, logoLabel, onLogout, settingsHref }: SidebarProps) {
  const { pathname } = useLocation()

  return (
    <>
      <aside className="hidden xl:sticky xl:top-0 xl:z-40 xl:flex h-screen w-[76px] shrink-0 flex-col items-center gap-1.5 bg-sidebar py-5">
        <div
          className="mb-5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-slate-500 text-white"
          role="img"
          aria-label={logoLabel}
          title={logoLabel}
        >
          <Link2 size={18} strokeWidth={1.8} />
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

        <button
          type="button"
          onClick={onLogout}
          className="flex w-[60px] flex-col items-center gap-1 py-2.5 text-sidebar-foreground hover:text-sidebar-accent-foreground"
          aria-label="로그아웃"
        >
          <LogOut size={18} strokeWidth={1.8} />
        </button>
      </aside>

      <nav className="xl:hidden fixed bottom-[18px] left-1/2 z-40 -translate-x-1/2 flex items-center gap-8 rounded-full bg-sidebar px-8 py-3 shadow-lg">
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

        {/* 전역 상단 헤더(MobileHeader) 폐기(2026-09-14)로 로그아웃 진입점이
            없어져 하단 nav 맨 우측에 신설 — 목업엔 없는 항목. 팝오버 대신
            전용 설정 페이지로 이동(사용자 결정, 2026-09-14). */}
        <Link
          to={settingsHref}
          aria-label="설정"
          className={
            isActive(pathname, settingsHref) ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/60'
          }
        >
          <Settings size={20} strokeWidth={1.8} />
        </Link>
      </nav>
    </>
  )
}

export default Sidebar
