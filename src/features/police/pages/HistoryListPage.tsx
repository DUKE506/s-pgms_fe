import { useState } from 'react'
import { useNavigate } from 'react-router'
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
import StatusBadge from '@/shared/components/StatusBadge'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { useAuthStore, type Role } from '../../auth/store/authStore'
import { listSecurityCaseHistory } from '../api/history'
import { computeCaseHistorySummary } from '../lib/historySummary'
import type { SecurityCase, SecurityCaseStatus } from '../types/securityCase'

const ALL = '전체'

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

// 본청/지역청 이력 목록에는 진행중 건도 섞여 있다 — 종결/취소는 이 화면 자체의
// 상세(/history/:id)로, 아직 끝나지 않은 건은 기존 경호 상세 화면
// (/security-cases/:id, 조회 전용)으로 보낸다(2026-08-27 결정).
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
  const historyQuery = useQuery({ queryKey: ['police-history'], queryFn: listSecurityCaseHistory })

  const [statusFilter, setStatusFilter] = useState<typeof ALL | SecurityCaseStatus>(ALL)
  const [jurisdictionFilter, setJurisdictionFilter] = useState(ALL)
  const [stationFilter, setStationFilter] = useState(ALL)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const cases = historyQuery.data ?? []
  const role = user?.role

  const scopeLabel =
    role === '본청'
      ? '전체 (본청)'
      : role === '지역청'
        ? `${cases[0]?.jurisdiction ?? user?.name} (관할 전체)`
        : (cases[0]?.policeStation ?? user?.name)

  const jurisdictions = [ALL, ...Array.from(new Set(cases.map((c) => c.jurisdiction)))]
  const stationsInScope =
    jurisdictionFilter === ALL ? cases : cases.filter((c) => c.jurisdiction === jurisdictionFilter)
  const stations = [ALL, ...Array.from(new Set(stationsInScope.map((c) => c.policeStation)))]

  const filteredCases = cases.filter((c) => {
    if (statusFilter !== ALL && c.status !== statusFilter) return false
    if (role === '본청' && jurisdictionFilter !== ALL && c.jurisdiction !== jurisdictionFilter) {
      return false
    }
    if (role !== '경찰서' && stationFilter !== ALL && c.policeStation !== stationFilter) {
      return false
    }
    if (dateFrom && c.startDate < dateFrom) return false
    if (dateTo && c.startDate > dateTo) return false
    if (search.trim()) {
      const managementNumber = formatManagementNumber(c.receiptNumber, c.securityCode)
      if (!managementNumber.includes(search.trim())) return false
    }
    return true
  })

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{scopeLabel}</p>
        <h1 className="text-xl font-bold text-foreground">이력 조회</h1>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
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
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="기간 시작"
            maxDate={dateTo}
            className="w-40 bg-card"
            aria-label="기간 시작"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <DateField
            value={dateTo}
            onChange={setDateTo}
            placeholder="기간 종료"
            minDate={dateFrom}
            className="w-40 bg-card"
            aria-label="기간 종료"
          />
        </div>

        {role === '본청' && (
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
        )}

        {role !== '경찰서' && (
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
        )}

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

      {historyQuery.isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      )}
      {historyQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">이력을 불러오지 못했습니다</p>
      )}
      {historyQuery.isSuccess && filteredCases.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">이력이 없습니다</p>
      )}

      {historyQuery.isSuccess && filteredCases.length > 0 && (
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
                {filteredCases.map((c) => (
                  <HistoryRow key={c.id} record={c} role={role} onClick={() => navigate(historyTarget(c))} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2.5 xl:hidden">
            {filteredCases.map((c) => (
              <HistoryCard key={c.id} record={c} role={role} onClick={() => navigate(historyTarget(c))} />
            ))}
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
  const { totalHours } = computeCaseHistorySummary(c.workSchedule)

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
  const { totalHours } = computeCaseHistorySummary(c.workSchedule)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left"
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
