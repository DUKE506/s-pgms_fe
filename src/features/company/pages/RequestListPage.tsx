import { useState } from 'react'
import { MoreVertical, Search, Trash2, UserPlus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { listPendingRequests } from '../api/requests'
import { listManagers } from '../api/managers'
import AssignManagerDialog from '../components/AssignManagerDialog'
import CancelPendingCaseDialog from '../components/CancelPendingCaseDialog'
import DispatchRequestViewDialog from '../components/DispatchRequestViewDialog'
import SecurityCaseTabs from '../components/SecurityCaseTabs'
import type { SecurityCase } from '../../police/types/securityCase'

const ALL = '전체'

function formatDate(dateLike: string) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function formatEndDate(dateLike: string) {
  const d = new Date(dateLike)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}.${dd}`
}

function RequestListPage() {
  const requestsQuery = useQuery({ queryKey: ['pending-requests'], queryFn: listPendingRequests })
  const managersQuery = useQuery({ queryKey: ['managers'], queryFn: listManagers })

  const [jurisdictionFilter, setJurisdictionFilter] = useState(ALL)
  const [stationFilter, setStationFilter] = useState(ALL)
  const [search, setSearch] = useState('')
  const [targetCase, setTargetCase] = useState<SecurityCase | null>(null)
  const [cancelTargetCase, setCancelTargetCase] = useState<SecurityCase | null>(null)
  const [viewCase, setViewCase] = useState<SecurityCase | null>(null)

  const requests = requestsQuery.data ?? []

  const jurisdictions = [ALL, ...Array.from(new Set(requests.map((r) => r.jurisdiction)))]
  const stationsInScope =
    jurisdictionFilter === ALL
      ? requests
      : requests.filter((r) => r.jurisdiction === jurisdictionFilter)
  const stations = [ALL, ...Array.from(new Set(stationsInScope.map((r) => r.policeStation)))]

  const filteredRequests = requests.filter((r) => {
    if (jurisdictionFilter !== ALL && r.jurisdiction !== jurisdictionFilter) return false
    if (stationFilter !== ALL && r.policeStation !== stationFilter) return false
    if (search.trim() && !r.receiptNumber.includes(search.trim())) return false
    return true
  })

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <h1 className="text-xl font-bold text-foreground">경호관리</h1>

      <SecurityCaseTabs active="배치요청" />

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

      {requestsQuery.isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      )}
      {requestsQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">
          배치요청 목록을 불러오지 못했습니다
        </p>
      )}
      {requestsQuery.isSuccess && filteredRequests.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">배치요청이 없습니다</p>
      )}

      {/* 데스크톱(xl 이상): 테이블. 그 아래는 카드 리스트 — s3m 모바일 패턴 참고 */}
      {requestsQuery.isSuccess && filteredRequests.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>관리번호</TableHead>
                  <TableHead>경찰서</TableHead>
                  <TableHead>지역청</TableHead>
                  <TableHead>요청일</TableHead>
                  <TableHead>배치기간</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setViewCase(r)}
                  >
                    <TableCell>{r.receiptNumber}</TableCell>
                    <TableCell>{r.policeStation}</TableCell>
                    <TableCell>{r.jurisdiction}</TableCell>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                    <TableCell>
                      {formatDate(r.startDate)} ~ {formatEndDate(r.endDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="더보기">
                              <MoreVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setTargetCase(r)}>
                              <UserPlus />
                              배정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setCancelTargetCase(r)}
                            >
                              <Trash2 />
                              취소
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2.5 xl:hidden">
            {filteredRequests.map((r) => (
              <div
                key={r.id}
                onClick={() => setViewCase(r)}
                className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{r.receiptNumber}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="더보기">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setTargetCase(r)}>
                          <UserPlus />
                          배정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setCancelTargetCase(r)}
                        >
                          <Trash2 />
                          취소
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-foreground/80">
                      {r.policeStation} · {r.jurisdiction}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.startDate)} ~ {formatEndDate(r.endDate)} (요청{' '}
                      {formatDate(r.createdAt)})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AssignManagerDialog
        targetCase={targetCase}
        managers={managersQuery.data ?? []}
        onOpenChange={(open) => !open && setTargetCase(null)}
      />
      <CancelPendingCaseDialog
        targetCase={cancelTargetCase}
        onOpenChange={(open) => !open && setCancelTargetCase(null)}
      />
      {viewCase && (
        <DispatchRequestViewDialog
          securityCase={viewCase}
          open
          onOpenChange={(open) => !open && setViewCase(null)}
        />
      )}
    </main>
  )
}

export default RequestListPage
