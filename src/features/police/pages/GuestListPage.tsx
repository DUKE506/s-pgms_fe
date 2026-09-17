import { useState } from 'react'
import { KeyRound, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import ListSkeleton from '@/shared/components/ListSkeleton'
import { useAuthStore } from '../../auth/store/authStore'
import { listGuestAccounts, type GuestAccount } from '../api/guests'
import IssueGuestAccountDialog, {
  type IssueGuestDialogState,
} from '../components/IssueGuestAccountDialog'
import DeleteGuestAccountDialog from '../components/DeleteGuestAccountDialog'
import ResetPoliceAccountPasswordDialog from '../components/ResetPoliceAccountPasswordDialog'

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

  const [search, setSearch] = useState('')
  const [dialogState, setDialogState] = useState<IssueGuestDialogState>(null)
  const [deleteTarget, setDeleteTarget] = useState<GuestAccount | null>(null)
  const [resetTarget, setResetTarget] = useState<{ loginId: string; userSeq: number } | null>(null)

  const guests = guestsQuery.data ?? []

  // 조회가능 경호건은 관리번호가 아니라 경호코드(guardCode)만 나열해 보여준다 —
  // GetGuestUserList 행의 accessList가 이미 경호코드를 담고 있다.
  function visibleCases(guest: GuestAccount) {
    return guest.accessCodes.length > 0 ? guest.accessCodes.join(', ') : '경호건 없음'
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
          <DropdownMenuItem
            onSelect={() => setResetTarget({ loginId: guest.id, userSeq: guest.userSeq })}
          >
            <KeyRound />
            비밀번호 초기화
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
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{user?.name}</p>
          <h1 className="text-xl font-bold text-foreground">계정 관리</h1>
        </div>

        {/* 목록형 헤더 규칙(docs/mobile-ui) — 제목 옆 모바일 전용 "+" 아이콘. */}
        <button
          type="button"
          onClick={() => setDialogState({ mode: 'issue' })}
          aria-label="게스트 계정 발급"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors active:bg-slate-700 xl:hidden"
        >
          <Plus className="size-4.5" />
        </button>
      </div>

      {/* 내 계정(#②, 2026-09-17) — 경찰서는 계정 목록 화면(#①) 자체가 없어,
          본인 비밀번호 초기화만 여기 카드 하나로 대신한다. userSeq는 로그인
          시 GetMyProfile에서 받아 세션에 싣어둔 값(authStore.user.userSeq). */}
      <Card>
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-foreground">내 계정</span>
            <span className="text-xs text-muted-foreground">{user?.id}</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={user?.userSeq == null}
            onClick={() => user?.userSeq != null && setResetTarget({ loginId: user.id, userSeq: user.userSeq })}
          >
            <KeyRound />
            비밀번호 초기화
          </Button>
        </CardContent>
      </Card>

      {/* 검색+데스크톱 발급 버튼은 xl 이상 전용. */}
      <div className="hidden gap-2.5 xl:flex xl:items-center xl:justify-end">
        <div className="relative xl:w-64">
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

      {guestsQuery.isLoading && <ListSkeleton columns={5} />}
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
                  <TableHead>비고</TableHead>
                  <TableHead>발급일</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell>{visibleCases(g)}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={g.memo ?? undefined}>
                      {g.memo || '-'}
                    </TableCell>
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
                {g.memo && <div className="text-xs text-muted-foreground">비고 {g.memo}</div>}
                <div className="text-xs text-muted-foreground">발급일 {formatDate(g.issuedAt)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <IssueGuestAccountDialog
        state={dialogState}
        onOpenChange={(open) => !open && setDialogState(null)}
      />
      <ResetPoliceAccountPasswordDialog
        target={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        invalidateQueryKey={['guests']}
      />
      <DeleteGuestAccountDialog
        targetGuest={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </main>
  )
}

export default GuestListPage
