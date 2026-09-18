import { useNavigate, useSearchParams } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
import SearchInput from '@/shared/components/SearchInput'
import StatusBadge from '@/shared/components/StatusBadge'
import { Pagination, LoadMoreButton } from '@/shared/components/HybridPagination'
import { useIsDesktop } from '@/shared/hooks/useIsDesktop'
import { useSearchDraft } from '@/shared/hooks/useSearchDraft'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { GUARD_CASE_STATUS_CODE } from '@/shared/lib/deployStatus'
import { useAuthStore, type Role } from '../../auth/store/authStore'
import {
  searchPoliceStationHistory,
  searchPoliceStationHistoryAccumulated,
  searchSecurityCaseHistory,
  searchSecurityCaseHistoryAccumulated,
} from '../api/history'
import type { SecurityCase, SecurityCaseStatus } from '../types/securityCase'

const ALL = '전체'
const PAGE_SIZE = 10

// 경찰서는 이미 경호목록(/security-cases)에서 진행중 건을 볼 수 있어 원래 설계대로
// 종결/취소만 유지하고, 본청/지역청은 Phase4 대시보드가 아직 없어 전체 상태를
// 다 보여준다(2026-08-27 결정, 조직 계층 공용 컴포넌트라 role에 따라 이 목록만
// 다르게 노출).
const TERMINAL_STATUSES: SecurityCaseStatus[] = ['종결', '취소']
const ALL_STATUSES: SecurityCaseStatus[] = ['접수', '배정', '경호중', '경호완료', '종결', '취소']

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

// 총경호시간 — 실 API(GetHistoryList)가 서버 집계값 totalGuardMinutes(분)를 직접 준다
// (종결 건만 실값, 취소·진행중·접수는 undefined → 목록에서 "-").
function totalHoursOf(c: SecurityCase) {
  return c.totalGuardMinutes != null ? c.totalGuardMinutes / 60 : 0
}

// 본청/지역청 이력 목록에는 진행중·접수 건도 섞여 있다 — 종결/취소는 이 화면 자체의
// 상세(/history/:id, id=caseSeq → GetHistoryDetail)로, 아직 끝나지 않은 건은 경호 상세
// 화면(/security-cases/:id, id=deploySeq → GetDeployDetail, 조회 전용)으로 보낸다
// (2026-08-27 결정). id는 api 계층에서 상태에 맞게 채워져 온다.
function historyTarget(c: SecurityCase): string {
  return c.status === '종결' || c.status === '취소' ? `/history/${c.id}` : `/security-cases/${c.id}`
}

// 화면 1h/2h/8: 이력 조회 목록 — 본청/지역청/경찰서가 조직 계층에 따라 스코프만
// 다르게 공유하는 화면(project-overview.md, roadmap Phase 3-1 결정). 원래는
// 종결/취소만 대상이었지만, 본청/지역청은 Phase4 대시보드가 아직 없어 진행중
// 건을 확인할 다른 화면이 없다는 사용자 피드백으로 전체 상태를 보여주도록
// 변경했다(경찰서는 경호목록이 이미 있어 종결/취소만 유지, 2026-08-27). 경호
// 시작·종료·총경호시간은 종결 건만 실값이고 취소/진행중은 전부 "-"(목업
// 1h/1hm/2h/2hm 다수 규칙 + 사용자 결정, 2026-08-27).
function HistoryListPage() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('q') ?? ''
  const statusFilter = (searchParams.get('status') ?? ALL) as typeof ALL | SecurityCaseStatus
  const dateFrom = searchParams.get('from') ?? ''
  const dateTo = searchParams.get('to') ?? ''
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  // 검색창은 엔터/검색버튼을 눌러야 커밋(IME 조합 깨짐 방지, 2026-09-18).
  const [searchDraft, setSearchDraft] = useSearchDraft(search)

  function patch(next: Record<string, string | undefined>) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(next)) {
          if (!value) params.delete(key)
          else params.set(key, value)
        }
        params.delete('page')
        return params
      },
      { replace: true },
    )
  }

  function commitSearch() {
    patch({ q: searchDraft || undefined })
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

  const role = user?.role
  // 필터·페이지네이션 서버 연동(docs/architecture.md "상태관리") — 3역할 모두 실
  // API(History/Police/W/GetHistoryList). 경찰서는 세션 groupSeq를 붙여 자기
  // 경찰서 종결·취소만, 본청/지역청은 groupSeq 없이 호출해 관할 이하 전 구간을
  // 받는다(서버가 토큰 역할로 스코프). "접수"는 서버 status 코드가 없어(접수 행은
  // status=null) 필터 파라미터로 못 보낸다 — 그 옵션을 고르면 현재 페이지 안에서만
  // 클라이언트 후처리한다(알려진 한계).
  const apiParams = {
    searchKey: search.trim() || undefined,
    status: statusFilter === ALL ? undefined : GUARD_CASE_STATUS_CODE[statusFilter as SecurityCaseStatus],
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  }

  const historyQuery = useQuery({
    queryKey: ['police-history-search', role, isDesktop ? 'page' : 'accumulated', apiParams],
    queryFn: () => {
      const isStation = role === '경찰서'
      if (isDesktop) {
        return isStation ? searchPoliceStationHistory(apiParams) : searchSecurityCaseHistory(apiParams)
      }
      return isStation
        ? searchPoliceStationHistoryAccumulated(apiParams)
        : searchSecurityCaseHistoryAccumulated(apiParams)
    },
    enabled: !!role,
  })

  const rows = historyQuery.data?.rows ?? []
  const filteredRows = statusFilter === '접수' ? rows.filter((c) => c.status === '접수') : rows
  const totalPages = historyQuery.data?.meta.totalPages ?? 1
  // 관리번호/경호시작/경호종료/총경호시간/최종상태/blank(6) + 역할별 지역청·경찰서 열.
  const historyColumns = 6 + (role === '본청' ? 1 : 0) + (role !== '경찰서' ? 1 : 0)

  const scopeLabel =
    role === '본청'
      ? '전체 (본청)'
      : role === '지역청'
        ? `${filteredRows[0]?.jurisdiction ?? user?.name} (관할 전체)`
        : (filteredRows[0]?.policeStation ?? user?.name)

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{scopeLabel}</p>
        <h1 className="text-xl font-bold text-foreground">이력 조회</h1>
      </div>

      {/* 원래는 모바일 목업(docs/mobile-ui)에 상태 칩 정도만 있어 경호목록과 같은
          규칙(검색·필터는 데스크톱 전용)으로 xl 이상에서만 노출했으나, 본청/지역청은
          이 화면이 유일한 필터 진입점이라 모바일에서 필터 자체가 사라지는 게 더 큰
          문제라는 사용자 피드백으로 전체 필터를 모바일까지 노출하도록 변경(2026-09-16,
          경찰서 이력 상세는 배치장소처럼 노출 범위를 따로 좁힌 선례가 있어 이번에도
          "화면별로 규칙이 다를 수 있다"는 전제 위에서 결정). 데스크톱 가로 배치는
          유지하고 모바일만 세로 스택으로 전환. */}
      <div className="flex flex-col gap-2.5 xl:flex-row xl:flex-wrap xl:items-center">
        <Select value={statusFilter} onValueChange={(v) => patch({ status: v === ALL ? undefined : v })}>
          <SelectTrigger className="w-full bg-card sm:w-32" aria-label="최종상태 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체</SelectItem>
            {(role === '경찰서' ? TERMINAL_STATUSES : ALL_STATUSES).map((s) => (
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

        <SearchInput
          draft={searchDraft}
          onDraftChange={setSearchDraft}
          onCommit={commitSearch}
          placeholder="관리번호 검색"
          aria-label="관리번호 검색"
          className="sm:max-w-64 sm:flex-1"
        />
      </div>

      {historyQuery.isLoading && <ListSkeleton columns={historyColumns} />}
      {historyQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">이력을 불러오지 못했습니다</p>
      )}
      {historyQuery.isSuccess && filteredRows.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">이력이 없습니다</p>
      )}

      {historyQuery.isSuccess && filteredRows.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>관리번호</TableHead>
                  {role === '본청' && <TableHead>지역청</TableHead>}
                  {role !== '경찰서' && <TableHead>경찰서</TableHead>}
                  <TableHead>경호시작</TableHead>
                  <TableHead>경호종료</TableHead>
                  <TableHead>총경호시간</TableHead>
                  <TableHead>최종상태</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((c) => (
                  <HistoryRow key={c.id} record={c} role={role} onClick={() => navigate(historyTarget(c))} />
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} className="hidden xl:flex" />

          <div className="flex flex-col gap-2.5 xl:hidden">
            {filteredRows.map((c) => (
              <HistoryCard key={c.id} record={c} role={role} onClick={() => navigate(historyTarget(c))} />
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
  role: Role | undefined
  onClick: () => void
}

function HistoryRow({ record: c, role, onClick }: RowProps) {
  const isClosed = c.status === '종결'
  const totalHours = totalHoursOf(c)

  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell>{formatManagementNumber(c.receiptNumber, c.securityCode)}</TableCell>
      {role === '본청' && <TableCell>{c.jurisdiction}</TableCell>}
      {role !== '경찰서' && <TableCell>{c.policeStation}</TableCell>}
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

function HistoryCard({ record: c, role, onClick }: RowProps) {
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
      {role !== '경찰서' && (
        <span className="text-xs text-muted-foreground">
          {role === '본청' ? `${c.jurisdiction} · ${c.policeStation}` : c.policeStation}
        </span>
      )}
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
