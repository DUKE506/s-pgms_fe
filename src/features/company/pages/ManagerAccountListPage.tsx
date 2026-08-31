import { useState } from 'react'
import { KeyRound, List, MoreVertical, Pencil, Search } from 'lucide-react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '../../auth/store/authStore'
import { listSecurityCases } from '../api/requests'
import { listManagerAccounts, type ManagerAccount } from '../api/managerAccounts'
import EditManagerAccountDialog from '../components/EditManagerAccountDialog'
import ResetManagerPasswordDialog from '../components/ResetManagerPasswordDialog'
import ManagerAssignedCasesDialog from '../components/ManagerAssignedCasesDialog'

// 2026-08-31 재확정 권한 매트릭스(roadmap.md Phase 3.6) — 서버(mocks/handlers/
// companyAccounts.ts)와 동일한 판정을 클라이언트에서도 미러링해 액션 노출 여부를
// 결정한다(실제 허용 여부는 서버가 다시 검증). 정보수정은 역할 무관 본인만.
function canEditInfo(actorId: string, _actorRole: string, target: ManagerAccount): boolean {
  return actorId === target.id
}

// 비밀번호 초기화는 본인은 항상 가능, 그 외엔 상위 역할이 하위 역할만 초기화 가능.
function canResetPassword(actorId: string, actorRole: string, target: ManagerAccount): boolean {
  if (actorId === target.id) return true
  if (actorRole === '시스템관리자') return true
  if (actorRole === '운영관리자') return target.role === '본부관리자'
  return false
}

function ManagerAccountListPage() {
  const user = useAuthStore((state) => state.user)
  const accountsQuery = useQuery({ queryKey: ['manager-accounts'], queryFn: listManagerAccounts })
  const casesQuery = useQuery({ queryKey: ['security-cases-all'], queryFn: listSecurityCases })

  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<ManagerAccount | null>(null)
  const [resetTarget, setResetTarget] = useState<ManagerAccount | null>(null)
  const [assignedCasesTarget, setAssignedCasesTarget] = useState<ManagerAccount | null>(null)

  const accounts = accountsQuery.data ?? []
  const cases = casesQuery.data ?? []

  const filtered = accounts.filter((a) => !search.trim() || a.name.includes(search.trim()))

  function menuFor(account: ManagerAccount) {
    if (!user) return null
    const showEdit = canEditInfo(user.id, user.role, account)
    const showReset = canResetPassword(user.id, user.role, account)
    // 담당경호는 시스템관리자/운영관리자에겐 모든 본부관리자 행에 공통 액션이지만,
    // 본부관리자 본인에게는 자기 행에서만 보이고 다른 본부관리자 행에는 아예
    // 버튼 자체가 없다(2026-08-31 재확정).
    const isOtherBranchManagerToBranchManager =
      user.role === '본부관리자' && account.role === '본부관리자' && account.id !== user.id
    const showAssignedCases = account.role === '본부관리자' && !isOtherBranchManagerToBranchManager
    if (!showEdit && !showReset && !showAssignedCases) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="더보기">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showEdit && (
            <DropdownMenuItem onSelect={() => setEditTarget(account)}>
              <Pencil />
              정보수정
            </DropdownMenuItem>
          )}
          {showReset && (
            <DropdownMenuItem onSelect={() => setResetTarget(account)}>
              <KeyRound />
              비밀번호 초기화
            </DropdownMenuItem>
          )}
          {showAssignedCases && (
            <DropdownMenuItem onSelect={() => setAssignedCasesTarget(account)}>
              <List />
              담당경호
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{user?.name}</p>
        <h1 className="text-xl font-bold text-foreground">관리자 계정 관리</h1>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative sm:w-64">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card pl-8"
            aria-label="이름 검색"
          />
        </div>
      </div>

      {accountsQuery.isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      )}
      {accountsQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">
          관리자 계정 목록을 불러오지 못했습니다
        </p>
      )}
      {accountsQuery.isSuccess && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">계정이 없습니다</p>
      )}

      {accountsQuery.isSuccess && filtered.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>아이디</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>본부</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>배정건수</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{a.id}</TableCell>
                    <TableCell>{a.role}</TableCell>
                    <TableCell>{a.branch ?? '-'}</TableCell>
                    <TableCell>{a.phone ?? '-'}</TableCell>
                    <TableCell>{a.role === '본부관리자' ? (a.assignedCount ?? 0) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">{menuFor(a)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2.5 xl:hidden">
            {filtered.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">{a.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.id} · {a.role}
                      {a.branch ? ` · ${a.branch}` : ''}
                    </span>
                  </div>
                  {menuFor(a)}
                </div>
                <div className="text-xs text-muted-foreground">연락처 {a.phone ?? '-'}</div>
                {a.role === '본부관리자' && (
                  <div className="text-xs text-muted-foreground">
                    배정건수 {a.assignedCount ?? 0}건
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <EditManagerAccountDialog
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />
      <ResetManagerPasswordDialog
        target={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
      />
      <ManagerAssignedCasesDialog
        target={assignedCasesTarget}
        cases={cases}
        onOpenChange={(open) => !open && setAssignedCasesTarget(null)}
      />
    </main>
  )
}

export default ManagerAccountListPage
