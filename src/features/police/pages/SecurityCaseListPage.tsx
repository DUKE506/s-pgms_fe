import { useState } from 'react'
import { useNavigate } from 'react-router'
import { CheckCircle2, ChevronRight, Inbox, Plus, Search, Shield, UserCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { cn } from '@/lib/utils'
import { useAuthStore } from '../../auth/store/authStore'
import { listSecurityCases } from '../api/securityCases'
import type { SecurityCaseStatus } from '../types/securityCase'

const ALL = '전체'
const CHIP_BASE =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-4.5 text-button font-semibold'

// 종결/취소는 이력 조회 화면(Phase 3, 미구현) 소관이라 경호목록에서는 제외한다 —
// 본사 경호목록(s6d)과 같은 이유(2026-08-24 결정), 경찰서 목록은 접수 상태도 포함.
// `as const`로 좁혀서 STATUS_ICON 매핑 시 4개 키만 요구하도록 함.
const VISIBLE_STATUSES = ['접수', '배정', '경호중', '경호완료'] as const satisfies readonly SecurityCaseStatus[]

const STATUS_BAR_COLOR: Record<SecurityCaseStatus, string> = {
  접수: 'bg-status-received',
  배정: 'bg-status-assigned',
  경호중: 'bg-status-active',
  경호완료: 'bg-status-completed',
  종결: 'bg-status-closed',
  취소: 'bg-status-cancelled',
}

// 목업 요약카드의 상태별 아이콘(2026-08-25 추가) — 접수는 Inbox, 배정은
// UserCheck, 경호중은 Shield, 경호완료는 CheckCircle2로 목업 svg 형태에 가장
// 가까운 lucide 아이콘을 매핑.
const STATUS_ICON: Record<(typeof VISIBLE_STATUSES)[number], typeof Inbox> = {
  접수: Inbox,
  배정: UserCheck,
  경호중: Shield,
  경호완료: CheckCircle2,
}

const STATUS_ICON_COLOR: Record<(typeof VISIBLE_STATUSES)[number], string> = {
  접수: 'text-status-received',
  배정: 'text-status-assigned',
  경호중: 'text-status-active',
  경호완료: 'text-status-completed',
}

function formatDate(dateLike: string) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function SecurityCaseListPage() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const casesQuery = useQuery({ queryKey: ['police-security-cases'], queryFn: listSecurityCases })

  const [statusFilter, setStatusFilter] = useState<typeof ALL | SecurityCaseStatus>(ALL)
  const [search, setSearch] = useState('')

  // 서버(mock)가 이미 내 경찰서 소속 건만 내려주므로 여기서는 종결/취소 상태만 뺀다.
  const cases = (casesQuery.data ?? []).filter((c) =>
    VISIBLE_STATUSES.some((s) => s === c.status),
  )
  const jurisdiction = cases[0]?.jurisdiction

  function countByStatus(status: SecurityCaseStatus) {
    return cases.filter((c) => c.status === status).length
  }

  const filteredCases = cases.filter((c) => {
    if (statusFilter !== ALL && c.status !== statusFilter) return false
    if (search.trim()) {
      const managementNumber = formatManagementNumber(c.receiptNumber, c.securityCode)
      if (!managementNumber.includes(search.trim())) return false
    }
    return true
  })

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {jurisdiction ? `${jurisdiction} / ${user?.name}` : user?.name}
        </p>
        <h1 className="text-xl font-bold text-foreground">경호목록</h1>
      </div>

      {casesQuery.isSuccess && cases.length > 0 && (
        <Card className="hidden xl:flex">
          {/* 요약카드(전체 건수+상태 세그먼트 바)는 목업(s3)에서 데스크톱에만 있고
              모바일(s3m)에는 없음 — 화면 폭이 좁아 칩+리스트만으로 구성됨. */}
          <CardContent className="flex flex-col gap-3.5">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-muted-foreground">전체</span>
              <span className="text-3xl font-bold text-foreground">
                {cases.length}
                <span className="ml-1 text-sm font-medium text-muted-foreground">건</span>
              </span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-md">
              {VISIBLE_STATUSES.map((status) => {
                const count = countByStatus(status)
                if (count === 0) return null
                return (
                  <div
                    key={status}
                    className={STATUS_BAR_COLOR[status]}
                    style={{ width: `${(count / cases.length) * 100}%` }}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-9">
              {VISIBLE_STATUSES.map((status) => {
                const Icon = STATUS_ICON[status]
                return (
                  <div key={status} className="flex items-center gap-2.5">
                    <Icon className={cn('size-4.5', STATUS_ICON_COLOR[status])} />
                    <span className="text-sm font-medium text-foreground/80">{status}</span>
                    <span className="text-xl font-bold text-foreground">{countByStatus(status)}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter(ALL)}
            className={cn(
              CHIP_BASE,
              statusFilter === ALL
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <span className="text-trim">전체 {cases.length}</span>
          </button>
          {VISIBLE_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                CHIP_BASE,
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-foreground hover:bg-muted',
              )}
            >
              <span className="text-trim">
                {status} {countByStatus(status)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2.5">
          <div className="relative flex-1 sm:max-w-64">
            <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="관리번호 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-card pl-8"
              aria-label="관리번호 검색"
            />
          </div>
          {/* 신규접수는 경찰서 전용 라우트(/security-cases/new) — 게스트는 조회
              전용이라 버튼 자체를 숨긴다(화면 9/10, 2026-08-27). */}
          {user?.role !== '게스트' && (
            <Button onClick={() => navigate('/security-cases/new')} className="shrink-0">
              <Plus className="size-3.5" />
              신규 접수
            </Button>
          )}
        </div>
      </div>

      {casesQuery.isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      )}
      {casesQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">경호목록을 불러오지 못했습니다</p>
      )}
      {casesQuery.isSuccess && filteredCases.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">경호건이 없습니다</p>
      )}

      {casesQuery.isSuccess && filteredCases.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>관리번호</TableHead>
                  <TableHead>대상자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>경호시작</TableHead>
                  <TableHead>경호종료</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/security-cases/${c.id}`)}
                  >
                    <TableCell>{formatManagementNumber(c.receiptNumber, c.securityCode)}</TableCell>
                    <TableCell>{c.subject.nameInitial}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>{formatDate(c.startDate)}</TableCell>
                    <TableCell>{formatDate(c.endDate)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2.5 xl:hidden">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/security-cases/${c.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/security-cases/${c.id}`)
                }}
                className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    {formatManagementNumber(c.receiptNumber, c.securityCode)}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/80">{c.subject.nameInitial}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(c.startDate)} ~ {formatDate(c.endDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}

export default SecurityCaseListPage
