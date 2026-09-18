import { useNavigate, useSearchParams } from 'react-router'
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
import { Pagination, LoadMoreButton } from '@/shared/components/HybridPagination'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { GUARD_CASE_STATUS_CODE } from '@/shared/lib/deployStatus'
import { cn } from '@/lib/utils'
import { listSecurityCases, searchGuardCases, searchGuardCasesAccumulated } from '../api/requests'
import { listOrgTree, type OrgTreeNode } from '../../police/api/accountManagement'
import SecurityCaseTabs from '../components/SecurityCaseTabs'
import { ACTIVE_SECURITY_CASE_STATUSES } from '../../police/types/securityCase'

const ALL = '전체'
const PAGE_SIZE = 10

// KPI 카드용 아이콘/색상 — 대시보드가 없는 본사의 기본 랜딩 화면이라 가벼운
// 상태별 요약만 가져온다(2026-09-15, 다크 히어로는 대시보드 전용이라 이 화면
// 성격엔 과함, 세그먼트 바도 불필요해 보인다는 사용자 피드백으로 개별 카드로
// 분리). 본사 목록은 배정/경호중/경호완료 3개만 다루므로 그 3개만 매핑.
type ActiveStatus = '배정' | '경호중' | '경호완료'
const SUMMARY_STATUSES: readonly ActiveStatus[] = ['배정', '경호중', '경호완료']

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

// 배정 직후 건은 경호기간이 아직 비어 있다(경호계획 등록 전). 그때는 "-"로 표시한다.
function formatDate(dateLike: string) {
  if (!dateLike) return '-'
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function regionsOf(tree: OrgTreeNode[]): OrgTreeNode[] {
  return tree.flatMap((root) => root.children)
}

function SecurityCaseListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDesktop = useIsDesktop()

  const search = searchParams.get('q') ?? ''
  const statusFilter = searchParams.get('status') ?? ALL
  const regionSeq = searchParams.get('region') ?? ''
  const groupSeq = searchParams.get('station') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  // 필터가 바뀌면 항상 page를 지운다(1페이지로 복귀) — region이 바뀌면 station도
  // 함께 지운다("지역청 선택 후 경찰서 선택"만 허용, 2026-09-18 결정).
  function patch(next: Record<string, string | undefined>, resetStation = false) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(next)) {
          if (!value) params.delete(key)
          else params.set(key, value)
        }
        if (resetStation) params.delete('station')
        params.delete('page')
        return params
      },
      { replace: true },
    )
  }

  // KPI 카드 4개(전체+상태별)는 사용자가 지금 적용한 필터와 무관하게 항상 전체
  // 현황을 보여준다(기존 동작 유지) — 관리자 계정 관리(배정건수 조인)·
  // SecurityCaseTabs(탭 카운트)와 캐시를 공유하는 전량조회를 그대로 재사용.
  const kpiQuery = useQuery({ queryKey: ['security-cases-all'], queryFn: listSecurityCases })
  const kpiCases = kpiQuery.data ?? []
  function countByStatus(status: ActiveStatus) {
    return kpiCases.filter((c) => c.status === status).length
  }

  const orgTreeQuery = useQuery({ queryKey: ['org-tree'], queryFn: listOrgTree })
  const regions = regionsOf(orgTreeQuery.data ?? [])
  const selectedRegion = regions.find((r) => String(r.groupSeq) === regionSeq)
  const stations = selectedRegion?.children ?? []

  const searchParamsForApi = {
    mgmtNo: search.trim() || undefined,
    regionSeq: regionSeq ? Number(regionSeq) : undefined,
    groupSeq: groupSeq ? Number(groupSeq) : undefined,
    status: statusFilter === ALL ? undefined : GUARD_CASE_STATUS_CODE[statusFilter as ActiveStatus],
  }

  const listQuery = useQuery({
    queryKey: [
      'security-cases-search',
      isDesktop ? 'page' : 'accumulated',
      searchParamsForApi,
      page,
      PAGE_SIZE,
    ],
    queryFn: () =>
      isDesktop
        ? searchGuardCases({ ...searchParamsForApi, pageNumber: page, pageSize: PAGE_SIZE })
        : searchGuardCasesAccumulated({ ...searchParamsForApi, pageNumber: page, pageSize: PAGE_SIZE }),
  })

  const rows = listQuery.data?.rows ?? []
  const totalPages = listQuery.data?.meta.totalPages ?? 1

  function goToPage(next: number) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next <= 1) params.delete('page')
        else params.set('page', String(next))
        return params
      },
      { replace: true },
    )
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <h1 className="text-xl font-bold text-foreground">경호관리</h1>

      <SecurityCaseTabs active="경호목록" />

      {/* KPI 카드(전체+상태별 3개, 개별 카드로 분리) — 데스크톱 전용. */}
      {kpiQuery.isSuccess && kpiCases.length > 0 && (
        <div className="hidden gap-3.5 xl:flex">
          <Card className="flex-1">
            <CardContent className="flex flex-col gap-2.5">
              <span className="text-sm font-medium text-muted-foreground">전체</span>
              <span className="text-3xl font-bold text-foreground">
                {kpiCases.length}
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
          value={regionSeq || ALL}
          onValueChange={(v) => patch({ region: v === ALL ? undefined : v }, true)}
        >
          <SelectTrigger className="w-full bg-card sm:w-40" aria-label="지역청 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>지역청 전체</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.groupSeq} value={String(r.groupSeq)}>
                {r.groupName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={groupSeq || ALL}
          onValueChange={(v) => patch({ station: v === ALL ? undefined : v })}
          disabled={!selectedRegion}
        >
          <SelectTrigger className="w-full bg-card sm:w-40" aria-label="경찰서 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>경찰서 전체</SelectItem>
            {stations.map((s) => (
              <SelectItem key={s.groupSeq} value={String(s.groupSeq)}>
                {s.groupName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => patch({ status: v === ALL ? undefined : v })}
        >
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
            onChange={(e) => patch({ q: e.target.value || undefined })}
            className="bg-card pl-8"
            aria-label="관리번호 검색"
          />
        </div>
      </div>

      {listQuery.isLoading && <ListSkeleton columns={7} />}
      {listQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">경호목록을 불러오지 못했습니다</p>
      )}
      {listQuery.isSuccess && rows.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">경호건이 없습니다</p>
      )}

      {listQuery.isSuccess && rows.length > 0 && (
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
                {rows.map((c) => (
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
          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} className="hidden xl:flex" />

          <div className="flex flex-col gap-2.5 xl:hidden">
            {rows.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/security-cases/${c.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/admin/security-cases/${c.id}`)
                }}
                className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-secondary"
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
            <LoadMoreButton
              hasMore={page < totalPages}
              loading={listQuery.isFetching}
              onLoadMore={() => goToPage(page + 1)}
            />
          </div>
        </>
      )}
    </main>
  )
}

export default SecurityCaseListPage
