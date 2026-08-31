import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/features/auth/store/authStore'
import { listPendingRequests, listSecurityCases } from '../api/requests'
import { ACTIVE_SECURITY_CASE_STATUSES } from '../../police/types/securityCase'

// 경호관리 관련 화면(배치요청/경호목록/연장요청/단축요청) 공통 탭 바.
// 화면마다 각자 구현하면 탭 순서·카운트가 어긋나기 쉬워(2026-08-24 실제로
// 순서가 어긋나는 버그 발생) 여기 한 곳에서만 순서/라벨/카운트를 관리하고
// 페이지는 현재 활성 탭만 알려주면 되도록 뽑았다.
const TAB_BASE =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4.5 text-button font-semibold'

export type SecurityCaseTabKey = '경호목록' | '배치요청' | '연장요청' | '단축요청'

interface SecurityCaseTabsProps {
  active: SecurityCaseTabKey
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
    <Link to={to} className={cn(TAB_BASE, 'border border-border bg-card text-foreground hover:bg-muted')}>
      <span className="text-trim">{children}</span>
    </Link>
  )
}

function SecurityCaseTabs({ active }: SecurityCaseTabsProps) {
  // 배치요청은 시스템관리자/운영관리자만 접근 가능(라우트 가드의 COMPANY_ADMIN과 동일
  // 기준) — 본부관리자에게는 탭 자체를 숨긴다(2026-08-31).
  const role = useAuthStore((state) => state.user?.role)
  const canSeeRequests = role !== '본부관리자'
  const casesQuery = useQuery({ queryKey: ['security-cases-all'], queryFn: listSecurityCases })
  const requestsQuery = useQuery({
    queryKey: ['pending-requests'],
    queryFn: listPendingRequests,
    enabled: canSeeRequests,
  })
  const activeCasesCount = casesQuery.data?.filter((c) =>
    ACTIVE_SECURITY_CASE_STATUSES.includes(c.status),
  ).length
  const extensionCount = casesQuery.data?.filter(
    (c) => c.pendingPeriodRequest?.type === '연장',
  ).length
  const shortenCount = casesQuery.data?.filter(
    (c) => c.pendingPeriodRequest?.type === '단축',
  ).length

  return (
    <div className="flex gap-2 overflow-x-auto">
      <Tab isActive={active === '경호목록'} to="/admin/security-cases">
        경호목록{activeCasesCount != null ? ` ${activeCasesCount}` : ''}
      </Tab>
      {canSeeRequests && (
        <Tab isActive={active === '배치요청'} to="/admin/requests">
          배치요청{requestsQuery.data ? ` ${requestsQuery.data.length}` : ''}
        </Tab>
      )}
      <Tab isActive={active === '연장요청'} to="/admin/period-requests/extension">
        연장요청{extensionCount != null ? ` ${extensionCount}` : ''}
      </Tab>
      <Tab isActive={active === '단축요청'} to="/admin/period-requests/shorten">
        단축요청{shortenCount != null ? ` ${shortenCount}` : ''}
      </Tab>
    </div>
  )
}

export default SecurityCaseTabs
