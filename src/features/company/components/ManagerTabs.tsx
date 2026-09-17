import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/store/authStore'

// [본사] "관리자" 화면 탭 바(#③, 2026-09-17 설계 확정) — 본사/경찰/게스트 3탭.
// SecurityCaseTabs.tsx와 같은 패턴(탭=별도 라우트, 활성 탭만 이 페이지가 안다).
// 경찰/게스트 탭은 시스템관리자·운영관리자만 — 본부관리자는 본인이 배정받은
// 경호건 범위 밖 계정을 다룰 이유가 없어 제외(SecurityCaseTabs의 배치요청
// 탭과 동일한 canSeeRequests 조건).
const TAB_BASE =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4.5 text-button font-semibold transition-colors'

export type ManagerTabKey = '본사' | '경찰' | '게스트'

interface ManagerTabsProps {
  active: ManagerTabKey
}

function Tab({ children, isActive, to }: { children: ReactNode; isActive: boolean; to: string }) {
  if (isActive) {
    return (
      <span className={cn(TAB_BASE, 'bg-primary text-primary-foreground')}>
        <span className="text-trim">{children}</span>
      </span>
    )
  }
  return (
    <Link to={to} className={cn(TAB_BASE, 'border border-border bg-card text-foreground hover:bg-muted active:bg-secondary')}>
      <span className="text-trim">{children}</span>
    </Link>
  )
}

function ManagerTabs({ active }: ManagerTabsProps) {
  const role = useAuthStore((state) => state.user?.role)
  const canSeePoliceAndGuest = role !== '본부관리자'

  // 본부관리자는 경찰·게스트 탭 자체가 안 보이니 "본사" 하나만 고를 게
  // 없는 탭으로 보여줄 이유가 없다(2026-09-17 사용자 결정) — 탭 바 전체를 숨김.
  if (!canSeePoliceAndGuest) return null

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      <Tab isActive={active === '본사'} to="/admin/managers">
        본사
      </Tab>
      <Tab isActive={active === '경찰'} to="/admin/managers/police">
        경찰
      </Tab>
      <Tab isActive={active === '게스트'} to="/admin/managers/guests">
        게스트
      </Tab>
    </div>
  )
}

export default ManagerTabs
