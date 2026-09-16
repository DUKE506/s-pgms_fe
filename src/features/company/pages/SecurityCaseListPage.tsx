import { useState } from 'react'
import { useNavigate } from 'react-router'
import { CheckCircle2, ChevronRight, Search, Shield, UserCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ListSkeleton from '@/shared/components/ListSkeleton'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { cn } from '@/lib/utils'
import { listSecurityCases } from '../api/requests'
import SecurityCaseTabs from '../components/SecurityCaseTabs'
import { ACTIVE_SECURITY_CASE_STATUSES } from '../../police/types/securityCase'
import type { SecurityCaseStatus } from '../../police/types/securityCase'

const ALL = '전체'

// ACTIVE_SECURITY_CASE_STATUSES는 SecurityCaseStatus[]로 선언돼 있어(as const
// 아님) [number]로는 리터럴이 좁혀지지 않는다 — 요약카드 매핑용으로 이 화면이
// 실제로 다루는 3개만 별도 리터럴 타입/배열로 좁힘.
type ActiveStatus = '배정' | '경호중' | '경호완료'
const SUMMARY_STATUSES: readonly ActiveStatus[] = ['배정', '경호중', '경호완료']

// KPI 카드용 아이콘/색상 — 대시보드가 없는 본사의 기본 랜딩 화면이라 가벼운
// 상태별 요약만 가져온다(2026-09-15, 다크 히어로는 대시보드 전용이라 이 화면
// 성격엔 과함, 세그먼트 바도 불필요해 보인다는 사용자 피드백으로 개별 카드로
// 분리). 본사 목록은 배정/경호중/경호완료 3개만 다루므로 그 3개만 매핑.
const STATUS_ICON: Record<ActiveStatus, typeof UserCheck> = {
  배정: UserCheck,
  경호중: Shield,
  경호완료: CheckCircle2,
}

const STATUS_ICON_COLOR: Record<ActiveStatus, string> = {
  배정: 'text-status-assigned',
  경호중: 'text-status-active',
  경호완료: 'text-status-completed',
}

// 배정 직후 건은 경호기간이 아직 비어 있다(경호계획 등록 전) — 그때는 "-"로 표시한다.
function formatDate(dateLike: string) {
  if (!dateLike) return '-'
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function SecurityCaseListPage() {
  const casesQuery = useQuery({ queryKey: ['security-cases-all'], queryFn: listSecurityCases })
  const navigate = useNavigate()

  const [jurisdictionFilter, setJurisdictionFilter] = useState(ALL)
  const [stationFilter, setStationFilter] = useState(ALL)
  const [assigneeFilter, setAssigneeFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [search, setSearch] = useState('')

  // 종결/취소는 이력 조회 화면 소관이라 경호목록에서는 제외한다 (2026-08-24 결정).
  const cases = (casesQuery.data ?? []).filter((c) =>
    ACTIVE_SECURITY_CASE_STATUSES.includes(c.status),
  )

  function countByStatus(status: SecurityCaseStatus) {
    return cases.filter((c) => c.status === status).length
  }

  const jurisdictions = [ALL, ...Array.from(new Set(cases.map((c) => c.jurisdiction)))]
  const stationsInScope =
    jurisdictionFilter === ALL ? cases : cases.filter((c) => c.jurisdiction === jurisdictionFilter)
  const stations = [ALL, ...Array.from(new Set(stationsInScope.map((c) => c.policeStation)))]
  // 담당자 필터는 이름 문자열 기준 — GetGuardCaseList가 담당자 id 없이 이름만 준다.
  const assigneeNames = [
    ALL,
    ...Array.from(new Set(cases.map((c) => c.assigneeName).filter((v): v is string => Boolean(v)))),
  ]

  const filteredCases = cases.filter((c) => {
    if (jurisdictionFilter !== ALL && c.jurisdiction !== jurisdictionFilter) return false
    if (stationFilter !== ALL && c.policeStation !== stationFilter) return false
    if (assigneeFilter !== ALL && c.assigneeName !== assigneeFilter) return false
    if (statusFilter !== ALL && c.status !== statusFilter) return false
    if (search.trim()) {
      const managementNumber = formatManagementNumber(c.receiptNumber, c.securityCode)
      if (!managementNumber.includes(search.trim())) return false
    }
    return true
  })

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <h1 className="text-xl font-bold text-foreground">경호관리</h1>

      <SecurityCaseTabs active="경호목록" />

      {/* KPI 카드(전체+상태별 3개, 개별 카드로 분리) — 세그먼트 바 버전 대신
          채택(2026-09-15, 사용자 피드백: 바가 불필요해 보임). 본사는 대시보드가
          없어 이 화면이 로그인 후 기본 랜딩이라 가벼운 현황 파악용으로
          추가(데스크톱 전용). */}
      {casesQuery.isSuccess && cases.length > 0 && (
        <div className="hidden gap-3.5 xl:flex">
          <Card className="flex-1">
            <CardContent className="flex flex-col gap-2.5">
              <span className="text-sm font-medium text-muted-foreground">전체</span>
              <span className="text-3xl font-bold text-foreground">
                {cases.length}
                <span className="ml-1 text-sm font-medium text-muted-foreground">건</span>
              </span>
            </CardContent>
          </Card>
          {SUMMARY_STATUSES.map((status) => {
            const Icon = STATUS_ICON[status]
            return (
              <Card key={status} className="flex-1">
                <CardContent className="flex flex-col gap-2.5">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Icon className={cn('size-4', STATUS_ICON_COLOR[status])} />
                    {status}
                  </span>
                  <span className="text-3xl font-bold text-foreground">
                    {countByStatus(status)}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">건</span>
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 목록형 헤더 규칙(docs/mobile-ui) — 검색·필터는 데스크톱 전용, 모바일은
          탭+리스트만. */}
      <div className="hidden gap-2.5 xl:flex xl:flex-wrap xl:items-center">
        <Select
          value={jurisdictionFilter}
          onValueChange={(v) => {
            setJurisdictionFilter(v)
            setStationFilter(ALL)
          }}
        >
          <SelectTrigger className="w-full bg-card sm:w-40" aria-label="지역청 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {jurisdictions.map((j) => (
              <SelectItem key={j} value={j}>
                {j === ALL ? '지역청 전체' : j}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="w-full bg-card sm:w-40" aria-label="경찰서 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stations.map((s) => (
              <SelectItem key={s} value={s}>
                {s === ALL ? '경찰서 전체' : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-full bg-card sm:w-40" aria-label="담당자 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assigneeNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name === ALL ? '담당자 전체' : name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full bg-card sm:w-40" aria-label="상태 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>상태 전체</SelectItem>
            {ACTIVE_SECURITY_CASE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative sm:max-w-64 sm:flex-1">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="관리번호 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card pl-8"
            aria-label="관리번호 검색"
          />
        </div>
      </div>

      {casesQuery.isLoading && <ListSkeleton columns={7} />}
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
                  <TableHead>경찰서</TableHead>
                  <TableHead>담당자</TableHead>
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
                    onClick={() => navigate(`/admin/security-cases/${c.id}`)}
                  >
                    <TableCell>{formatManagementNumber(c.receiptNumber, c.securityCode)}</TableCell>
                    <TableCell>{c.policeStation}</TableCell>
                    <TableCell>{c.assigneeName ?? '-'}</TableCell>
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
                onClick={() => navigate(`/admin/security-cases/${c.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/admin/security-cases/${c.id}`)
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
                  <span className="text-xs font-medium text-foreground/80">
                    {c.policeStation} · {c.assigneeName ?? '담당자 미배정'}
                  </span>
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
