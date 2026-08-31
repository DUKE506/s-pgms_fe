import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ChevronRight, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
import StatusBadge from '@/shared/components/StatusBadge'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { listSecurityCases } from '../api/requests'
import { listManagers } from '../api/managers'
import SecurityCaseTabs from '../components/SecurityCaseTabs'
import { ACTIVE_SECURITY_CASE_STATUSES } from '../../police/types/securityCase'

const ALL = '전체'

function formatDate(dateLike: string) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function SecurityCaseListPage() {
  const casesQuery = useQuery({ queryKey: ['security-cases-all'], queryFn: listSecurityCases })
  const managersQuery = useQuery({ queryKey: ['managers'], queryFn: listManagers })
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
  const managers = managersQuery.data ?? []
  const managersById = new Map(managers.map((m) => [m.id, m]))

  const jurisdictions = [ALL, ...Array.from(new Set(cases.map((c) => c.jurisdiction)))]
  const stationsInScope =
    jurisdictionFilter === ALL ? cases : cases.filter((c) => c.jurisdiction === jurisdictionFilter)
  const stations = [ALL, ...Array.from(new Set(stationsInScope.map((c) => c.policeStation)))]
  const assigneeIds = [
    ALL,
    ...Array.from(new Set(cases.map((c) => c.assigneeId).filter((v): v is string => Boolean(v)))),
  ]

  const filteredCases = cases.filter((c) => {
    if (jurisdictionFilter !== ALL && c.jurisdiction !== jurisdictionFilter) return false
    if (stationFilter !== ALL && c.policeStation !== stationFilter) return false
    if (assigneeFilter !== ALL && c.assigneeId !== assigneeFilter) return false
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

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
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
            {assigneeIds.map((id) => (
              <SelectItem key={id} value={id}>
                {id === ALL ? '담당자 전체' : (managersById.get(id)?.name ?? id)}
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
                  <TableHead>경찰서</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>본부</TableHead>
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
                    <TableCell>{c.assigneeId ? (managersById.get(c.assigneeId)?.name ?? '-') : '-'}</TableCell>
                    <TableCell>{c.assigneeId ? (managersById.get(c.assigneeId)?.branch ?? '-') : '-'}</TableCell>
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
                    {c.policeStation} · {c.assigneeId ? (managersById.get(c.assigneeId)?.name ?? '-') : '담당자 미배정'}
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
