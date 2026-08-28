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
import { listSecurityCaseHistory } from '../../police/api/history'
import { computeCaseHistorySummary } from '../../police/lib/historySummary'
import type { SecurityCase, SecurityCaseStatus } from '../../police/types/securityCase'

const ALL = '전체'
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

// 화면 12: 본사 이력 조회 — 진행중 건은 이미 /admin/security-cases에서 볼 수 있어
// 경찰서 이력 목록과 같은 이유로 종결/취소만 대상이지만, 본사는 전국 스코프라
// 지역청/경찰서 컬럼·필터를 둘 다 갖는 본청 이력 목록 형태를 따른다(2026-08-27,
// Phase 3 항목2 논의 결정).
function HistoryListPage() {
  const navigate = useNavigate()
  const historyQuery = useQuery({ queryKey: ['company-history'], queryFn: listSecurityCaseHistory })

  const [statusFilter, setStatusFilter] = useState<typeof ALL | SecurityCaseStatus>(ALL)
  const [jurisdictionFilter, setJurisdictionFilter] = useState(ALL)
  const [stationFilter, setStationFilter] = useState(ALL)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const cases = historyQuery.data ?? []

  const jurisdictions = [ALL, ...Array.from(new Set(cases.map((c) => c.jurisdiction)))]
  const stationsInScope =
    jurisdictionFilter === ALL ? cases : cases.filter((c) => c.jurisdiction === jurisdictionFilter)
  const stations = [ALL, ...Array.from(new Set(stationsInScope.map((c) => c.policeStation)))]

  const filteredCases = cases.filter((c) => {
    if (statusFilter !== ALL && c.status !== statusFilter) return false
    if (jurisdictionFilter !== ALL && c.jurisdiction !== jurisdictionFilter) return false
    if (stationFilter !== ALL && c.policeStation !== stationFilter) return false
    if (dateFrom && c.startDate < dateFrom) return false
    if (dateTo && c.startDate > dateTo) return false
    if (search.trim()) {
      const q = search.trim()
      const managementNumber = formatManagementNumber(c.receiptNumber, c.securityCode)
      if (!managementNumber.includes(q) && !c.policeStation.includes(q)) return false
    }
    return true
  })

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <h1 className="text-xl font-bold text-foreground">이력 조회</h1>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
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

        <div className="relative sm:max-w-64 sm:flex-1">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="관리번호 · 경찰서명 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card pl-8"
            aria-label="관리번호 · 경찰서명 검색"
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
                {filteredCases.map((c) => (
                  <HistoryRow key={c.id} record={c} onClick={() => navigate(`/admin/history/${c.id}`)} />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2.5 xl:hidden">
            {filteredCases.map((c) => (
              <HistoryCard key={c.id} record={c} onClick={() => navigate(`/admin/history/${c.id}`)} />
            ))}
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
  const { totalHours } = computeCaseHistorySummary(c.workSchedule)

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
