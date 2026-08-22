import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listWorkers } from '../api/workers'
import RegisterWorkerDialog from '../components/RegisterWorkerDialog'

function WorkerListPage() {
  const workersQuery = useQuery({ queryKey: ['workers'], queryFn: listWorkers })
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const workers = workersQuery.data ?? []
  const filtered = workers.filter((w) => {
    const q = search.trim()
    if (!q) return true
    return w.name.includes(q) || w.employeeId.includes(q)
  })

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <h1 className="text-xl font-bold text-foreground">근무자 목록</h1>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex h-9 w-fit shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
          전체 {workers.length}
        </span>
        <div className="flex gap-2.5">
          <div className="relative sm:w-64">
            <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="이름 · 사번 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-card pl-8"
              aria-label="이름 사번 검색"
            />
          </div>
          <Button onClick={() => setDialogOpen(true)} className="shrink-0">
            <Plus />
            근무자 등록
          </Button>
        </div>
      </div>

      {workersQuery.isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      )}
      {workersQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">
          근무자 목록을 불러오지 못했습니다
        </p>
      )}
      {workersQuery.isSuccess && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">근무자가 없습니다</p>
      )}

      {/* 데스크톱(xl 이상): 테이블. 그 아래는 카드 리스트 — 목록 화면 공통 반응형 패턴 */}
      {workersQuery.isSuccess && filtered.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>사번</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>연락처</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.employeeId}</TableCell>
                    <TableCell>{w.department}</TableCell>
                    <TableCell>{w.phone}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2.5 xl:hidden">
            {filtered.map((w) => (
              <div
                key={w.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{w.name}</span>
                  <span className="text-xs text-muted-foreground">{w.employeeId}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{w.department}</span>
                  <span>{w.phone}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <RegisterWorkerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </main>
  )
}

export default WorkerListPage
