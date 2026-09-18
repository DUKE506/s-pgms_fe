import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useUrlSearchInput } from '@/shared/hooks/useUrlSearchInput'
import { listWorkers, type Worker } from '../api/workers'
import RegisterWorkerDialog from '../components/RegisterWorkerDialog'
import EditWorkerDialog from '../components/EditWorkerDialog'
import DeleteWorkerDialog from '../components/DeleteWorkerDialog'

function WorkerListPage() {
  const navigate = useNavigate()
  const workersQuery = useQuery({ queryKey: ['workers'], queryFn: listWorkers })
  // 검색어만 URL 쿼리(?q=)에 동기화 — 서버 API(GetGuardList)에 파라미터가 없어
  // 클라이언트 필터는 그대로 둔다(docs/architecture.md "상태관리", 2026-09-18
  // 배치 B). 엔터/검색버튼을 눌러야 커밋(IME 조합 깨짐 방지).
  const { value: search, draft, setDraft, commit } = useUrlSearchInput('q')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Worker | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null)

  const workers = workersQuery.data ?? []
  const filtered = workers.filter((w) => {
    const q = search.trim()
    if (!q) return true
    return w.name.includes(q) || w.employeeId.includes(q)
  })

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">근무자 목록</h1>

        {/* 목록형 헤더 규칙(docs/mobile-ui) — 제목 옆 모바일 전용 "+" 아이콘. */}
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label="근무자 등록"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors active:bg-slate-700 xl:hidden"
        >
          <Plus className="size-4.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        <span className="inline-flex h-9 w-fit shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
          전체 {workers.length}
        </span>
        {/* 검색+데스크톱 등록 버튼은 xl 이상 전용. */}
        <div className="hidden gap-2.5 xl:flex">
          <SearchInput
            draft={draft}
            onDraftChange={setDraft}
            onCommit={commit}
            placeholder="이름 · 사번 검색"
            aria-label="이름 사번 검색"
            className="sm:w-64"
          />
          <Button onClick={() => setDialogOpen(true)} className="shrink-0">
            <Plus />
            근무자 등록
          </Button>
        </div>
      </div>

      {workersQuery.isLoading && <ListSkeleton columns={5} />}
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
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/workers/${w.id}`)}
                  >
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.employeeId}</TableCell>
                    <TableCell>{w.department || '-'}</TableCell>
                    <TableCell>{w.phone || '-'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <WorkerRowMenu
                        onEdit={() => setEditTarget(w)}
                        onDelete={() => setDeleteTarget(w)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2.5 xl:hidden">
            {filtered.map((w) => (
              <div
                key={w.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/workers/${w.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') navigate(`/admin/workers/${w.id}`)
                }}
                className="flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-secondary"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{w.name}</span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground">{w.employeeId}</span>
                    <WorkerRowMenu
                      onEdit={() => setEditTarget(w)}
                      onDelete={() => setDeleteTarget(w)}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {[w.department, w.phone].filter(Boolean).join(' · ') || '-'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <RegisterWorkerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EditWorkerDialog target={editTarget} onOpenChange={(open) => !open && setEditTarget(null)} />
      <DeleteWorkerDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </main>
  )
}

function WorkerRowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="더보기">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          정보수정
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default WorkerListPage
