import { useState } from 'react'
import { KeyRound, MoreVertical, Search } from 'lucide-react'
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
import ListSkeleton from '@/shared/components/ListSkeleton'
import { useAuthStore } from '../../auth/store/authStore'
import { listPoliceAccounts, type PoliceAccountRow } from '../api/accountManagement'
import ResetPoliceAccountPasswordDialog from '../components/ResetPoliceAccountPasswordDialog'

// [경찰] 본청/지역청 계정 관리(#①, 2026-09-17 대화로 설계 확정) — 신규
// "목록조회" API가 호출자 스코프(본청=전국/지역청=관할 이하)를 서버에서
// 좁혀 내려주므로, 화면은 역할 분기 없이 받은 트리를 평면 테이블로만 보여준다.
// 본사 [본사] 관리자 탭 "경찰"(#③)도 같은 API·같은 평면화 로직을 쓰지만,
// 그쪽은 라우트/역할가드만 다르고 화면 자체는 별도(본사 쪽 도착하면 이 페이지
// 구조를 그대로 복제). 경찰서는 이 화면 자체가 없다 — 게스트 계정 관리
// 화면(#②)에서 "내 계정" 카드로 대체.
const QUERY_KEY = ['police-accounts']

function AccountManagementPage() {
  const user = useAuthStore((state) => state.user)
  const accountsQuery = useQuery({ queryKey: QUERY_KEY, queryFn: listPoliceAccounts })

  const [search, setSearch] = useState('')
  const [resetTarget, setResetTarget] = useState<PoliceAccountRow | null>(null)

  const accounts = accountsQuery.data ?? []
  const filtered = accounts.filter(
    (a) => !search.trim() || a.orgPath.includes(search.trim()) || a.userName.includes(search.trim()),
  )

  function menuFor(account: PoliceAccountRow) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="더보기">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setResetTarget(account)}>
            <KeyRound />
            비밀번호 초기화
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{user?.name}</p>
        <h1 className="text-xl font-bold text-foreground">계정 관리</h1>
      </div>

      <div className="hidden xl:flex xl:items-center xl:justify-end">
        <div className="relative xl:w-64">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="소속·이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card pl-8"
            aria-label="소속·이름 검색"
          />
        </div>
      </div>

      {accountsQuery.isLoading && <ListSkeleton columns={5} />}
      {accountsQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">계정 목록을 불러오지 못했습니다</p>
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
                  <TableHead>소속</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>아이디</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.userSeq}>
                    <TableCell>{a.orgPath}</TableCell>
                    <TableCell>{a.userName}</TableCell>
                    <TableCell>{a.loginId}</TableCell>
                    <TableCell>{a.codeName}</TableCell>
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
                key={a.userSeq}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">{a.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.loginId} · {a.codeName}
                    </span>
                  </div>
                  {menuFor(a)}
                </div>
                <div className="text-xs text-muted-foreground">{a.orgPath}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <ResetPoliceAccountPasswordDialog
        target={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        invalidateQueryKey={QUERY_KEY}
      />
    </main>
  )
}

export default AccountManagementPage
