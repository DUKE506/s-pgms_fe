import { useState } from 'react'
import { MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { listSecurityCases } from '../api/securityCases'
import { listGuestAccounts, type GuestAccount } from '../api/guests'
import IssueGuestAccountDialog, {
  type IssueGuestDialogState,
} from '../components/IssueGuestAccountDialog'
import DeleteGuestAccountDialog from '../components/DeleteGuestAccountDialog'

function formatDate(dateLike: string) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function GuestListPage() {
  const user = useAuthStore((state) => state.user)
  const guestsQuery = useQuery({ queryKey: ['guests'], queryFn: listGuestAccounts })
  const casesQuery = useQuery({ queryKey: ['police-security-cases'], queryFn: listSecurityCases })

  const [search, setSearch] = useState('')
  const [dialogState, setDialogState] = useState<IssueGuestDialogState>(null)
  const [deleteTarget, setDeleteTarget] = useState<GuestAccount | null>(null)

  const guests = guestsQuery.data ?? []
  const cases = casesQuery.data ?? []
  const codeById = new Map(cases.map((c) => [c.id, c.securityCode]))

  // 목업(s9)은 조회가능 경호건을 관리번호가 아니라 경호코드만 나열해 보여준다.
  function visibleCases(guest: GuestAccount) {
    const codes = guest.caseIds
      .map((id) => codeById.get(id))
      .filter((code): code is string => Boolean(code))
    return codes.length > 0 ? codes.join(', ') : '-'
  }

  const filtered = guests.filter((g) => !search.trim() || g.name.includes(search.trim()))

  function menuFor(guest: GuestAccount) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="더보기">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialogState({ mode: 'edit', guest })}>
            <Pencil />
            수정
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(guest)}>
            <Trash2 />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{user?.name}</p>
        <h1 className="text-xl font-bold text-foreground">게스트 계정 관리</h1>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative sm:w-64">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="아이디 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card pl-8"
            aria-label="아이디 검색"
          />
        </div>
        <Button onClick={() => setDialogState({ mode: 'issue' })} className="shrink-0">
          <Plus />
          게스트 계정 발급
        </Button>
      </div>

      {guestsQuery.isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      )}
      {guestsQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">
          게스트 계정 목록을 불러오지 못했습니다
        </p>
      )}
      {guestsQuery.isSuccess && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">게스트 계정이 없습니다</p>
      )}

      {guestsQuery.isSuccess && filtered.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>아이디</TableHead>
                  <TableHead>조회가능 경호건</TableHead>
                  <TableHead>발급일</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell>{visibleCases(g)}</TableCell>
                    <TableCell>{formatDate(g.issuedAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">{menuFor(g)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2.5 xl:hidden">
            {filtered.map((g) => (
              <div
                key={g.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{g.name}</span>
                  {menuFor(g)}
                </div>
                <div className="text-xs text-muted-foreground">{visibleCases(g)}</div>
                <div className="text-xs text-muted-foreground">발급일 {formatDate(g.issuedAt)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <IssueGuestAccountDialog
        state={dialogState}
        cases={cases}
        onOpenChange={(open) => !open && setDialogState(null)}
      />
      <DeleteGuestAccountDialog
        targetGuest={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </main>
  )
}

export default GuestListPage
