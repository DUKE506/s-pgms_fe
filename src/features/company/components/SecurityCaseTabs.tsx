import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { listPendingRequests, listSecurityCases } from '../api/requests'
import { ACTIVE_SECURITY_CASE_STATUSES } from '../../police/types/securityCase'

// 경호관리 관련 화면(배치요청/경호목록/연장요청/단축요청) 공통 탭 바.
// 화면마다 각자 구현하면 탭 순서·카운트가 어긋나기 쉬워(2026-08-24 실제로
// 순서가 어긋나는 버그 발생) 여기 한 곳에서만 순서/라벨/카운트를 관리하고
// 페이지는 현재 활성 탭만 알려주면 되도록 뽑았다. 연장요청/단축요청은
// 아직 로드맵에 화면 계획이 없어 목업처럼 비활성 탭으로만 둔다.
const TAB_BASE =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4.5 text-button font-semibold'

export type SecurityCaseTabKey = '경호목록' | '배치요청'

interface SecurityCaseTabsProps {
  active: SecurityCaseTabKey
}

function Tab({ children, isActive, to }: { children: ReactNode; isActive: boolean; to: string }) {
  if (isActive) {
    return <span className={cn(TAB_BASE, 'bg-primary text-primary-foreground')}>{children}</span>
  }
  return (
    <Link to={to} className={cn(TAB_BASE, 'border border-border bg-card text-foreground hover:bg-muted')}>
      {children}
    </Link>
  )
}

function SecurityCaseTabs({ active }: SecurityCaseTabsProps) {
  const casesQuery = useQuery({ queryKey: ['security-cases-all'], queryFn: listSecurityCases })
  const requestsQuery = useQuery({ queryKey: ['pending-requests'], queryFn: listPendingRequests })
  const activeCasesCount = casesQuery.data?.filter((c) =>
    ACTIVE_SECURITY_CASE_STATUSES.includes(c.status),
  ).length

  return (
    <div className="flex gap-2 overflow-x-auto">
      <Tab isActive={active === '경호목록'} to="/admin/security-cases">
        경호목록{activeCasesCount != null ? ` ${activeCasesCount}` : ''}
      </Tab>
      <Tab isActive={active === '배치요청'} to="/admin/requests">
        배치요청{requestsQuery.data ? ` ${requestsQuery.data.length}` : ''}
      </Tab>
      <span
        aria-disabled="true"
        className={cn(TAB_BASE, 'cursor-not-allowed border border-border bg-card text-muted-foreground/50')}
      >
        연장요청
      </span>
      <span
        aria-disabled="true"
        className={cn(TAB_BASE, 'cursor-not-allowed border border-border bg-card text-muted-foreground/50')}
      >
        단축요청
      </span>
    </div>
  )
}

export default SecurityCaseTabs
