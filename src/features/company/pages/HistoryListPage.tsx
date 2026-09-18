import { useNavigate, useSearchParams } from 'react-router'
import { ChevronRight, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import DateField from '@/shared/components/DateField'
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
import { searchCompanyHistory, searchCompanyHistoryAccumulated } from '../api/history'
import { listOrgTree, type OrgTreeNode } from '../../police/api/accountManagement'
import type { SecurityCase, SecurityCaseStatus } from '../../police/types/securityCase'

const ALL = '전체'
const PAGE_SIZE = 10
const TERMINAL_STATUSES: SecurityCaseStatus[] = ['종결', '취소']

function formatDate(dateLike: string) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}시간` : `${hours.toFixed(1)}시간`
}

// 실 API(GetHistoryList)는 총근무시간을 totalGuardMinutes(분)로 직접 준다 — 종결
// 건만 실값, 취소·미상은 undefined.
function totalHoursOf(c: SecurityCase) {
  return c.totalGuardMinutes != null ? c.totalGuardMinutes / 60 : 0
}

function regionsOf(tree: OrgTreeNode[]): OrgTreeNode[] {
  return tree.flatMap((root) => root.children)
}

// 화면 12: 본사 이력 조회 — 진행중 건은 이미 /admin/security-cases에서 볼 수 있어
// 경찰서 이력 목록과 같은 이유로 종결/취소만 대상이지만, 본사는 전국 스코프라
// 지역청/경찰서 컬럼·필터를 둘 다 갖는 본청 이력 목록 형태를 따른다(2026-08-27,
// Phase 3 항목2 논의 결정).
function HistoryListPage() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('q') ?? ''
  const statusFilter = (searchParams.get('status') ?? ALL) as typeof ALL | SecurityCaseStatus
  const dateFrom = searchParams.get('from') ?? ''
  const dateTo = searchParams.get('to') ?? ''
  const regionSeq = searchParams.get('region') ?? ''
  const groupSeq = searchParams.get('station') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  // 필터가 바뀌면 항상 page를 지운다(1페이지로 복귀) — region이 바뀌면 station도
  // 함께 지운다("지역청 선택 후 경찰서 선택"만 허용).
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

  const orgTreeQuery = useQuery({ queryKey: ['org-tree'], queryFn: listOrgTree })
  const regions = regionsOf(orgTreeQuery.data ?? [])
  const selectedRegion = regions.find((r) => String(r.groupSeq) === regionSeq)
  const stations = selectedRegion?.children ?? []

  const apiParams = {
    searchKey: search.trim() || undefined,
    status: statusFilter === ALL ? undefined : GUARD_CASE_STATUS_CODE[statusFilter as SecurityCaseStatus],
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
    regionSeq: regionSeq ? Number(regionSeq) : undefined,
    groupSeq: groupSeq ? Number(groupSeq) : undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  }

  const historyQuery = useQuery({
    queryKey: ['company-history-search', isDesktop ? 'page' : 'accumulated', apiParams],
    queryFn: () =>
      isDesktop ? searchCompanyHistory(apiParams) : searchCompanyHistoryAccumulated(apiParams),
  })

  const rows = historyQuery.data?.rows ?? []
  const totalPages = historyQuery.data?.meta.totalPages ?? 1

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <h1 className="text-xl font-bold text-foreground">이력 조회</h1>

      {/* 경찰 이력 조회와 같은 이유(2026-09-16, HistoryListPage.tsx police 쪽 주석
          참고)로 모바일까지 필터 전체 노출 — 데스크톱 가로 배치는 유지하고 모바일만
          세로 스택으로 전환. */}
      <div className="flex flex-col gap-2.5 xl:flex-row xl:flex-wrap xl:items-center">
        <Select
          value={statusFilter}
          onValueChange={(v) => patch({ status: v === ALL ? undefined : v })}
        >
          <SelectTrigger className="w-full bg-card sm:w-32" aria-label="최종상태 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체</SelectItem>
            {TERMINAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <DateField
            variant="calendar"
            value={dateFrom}
            onChange={(v) => patch({ from: v || undefined })}
            placeholder="기간 시작"
            maxDate={dateTo}
            className="flex-1 min-w-0 bg-card sm:w-40 sm:flex-none"
            aria-label="기간 시작"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <DateField
            variant="calendar"
            value={dateTo}
            onChange={(v) => patch({ to: v || undefined })}
            placeholder="기간 종료"
            minDate={dateFrom}
            className="flex-1 min-w-0 bg-card sm:w-40 sm:flex-none"
            aria-label="기간 종료"
          />
        </div>

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

      {historyQuery.isLoading && <ListSkeleton columns={8} />}
      {historyQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">이력을 불러오지 못했습니다</p>
      )}
      {historyQuery.isSuccess && rows.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">이력이 없습니다</p>
      )}

      {historyQuery.isSuccess && rows.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>관리번호</TableHead>
                  <TableHead>지역청</TableHead>
                  <TableHead>경찰서</TableHead>
                  <TableHead>경호시작</TableHead>
                  <TableHead>경호종료</TableHead>
                  <TableHead>총경호시간</TableHead>
                  <TableHead>최종상태</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <HistoryRow key={c.id} record={c} onClick={() => navigate(`/admin/history/${c.id}`)} />
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} className="hidden xl:flex" />

          <div className="flex flex-col gap-2.5 xl:hidden">
            {rows.map((c) => (
              <HistoryCard key={c.id} record={c} onClick={() => navigate(`/admin/history/${c.id}`)} />
            ))}
            <LoadMoreButton
              hasMore={page < totalPages}
              loading={historyQuery.isFetching}
              onLoadMore={() => goToPage(page + 1)}
            />
          </div>
        </>
      )}
    </main>
  )
}

interface RowProps {
  record: SecurityCase
  onClick: () => void
}

function HistoryRow({ record: c, onClick }: RowProps) {
  const isClosed = c.status === '종결'
  const totalHours = totalHoursOf(c)

  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell>{formatManagementNumber(c.receiptNumber, c.securityCode)}</TableCell>
      <TableCell>{c.jurisdiction}</TableCell>
      <TableCell>{c.policeStation}</TableCell>
      <TableCell>{isClosed ? formatDate(c.startDate) : '-'}</TableCell>
      <TableCell>{isClosed ? formatDate(c.endDate) : '-'}</TableCell>
      <TableCell>{isClosed ? formatHours(totalHours) : '-'}</TableCell>
      <TableCell>
        <StatusBadge status={c.status} />
      </TableCell>
      <TableCell>
        <div className="flex justify-end">
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </TableCell>
    </TableRow>
  )
}

function HistoryCard({ record: c, onClick }: RowProps) {
  const isClosed = c.status === '종결'
  const totalHours = totalHoursOf(c)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-secondary"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">
          {formatManagementNumber(c.receiptNumber, c.securityCode)}
        </span>
        <StatusBadge status={c.status} />
      </div>
      <span className="text-xs text-muted-foreground">
        {c.jurisdiction} · {c.policeStation}
      </span>
      {isClosed && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDate(c.startDate)} ~ {formatDate(c.endDate)}
          </span>
          <span>{formatHours(totalHours)}</span>
        </div>
      )}
    </div>
  )
}

export default HistoryListPage
