import { useState } from 'react'
import { KeyRound, MoreVertical } from 'lucide-react'
import { useUrlSearchInput } from '@/shared/hooks/useUrlSearchInput'
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
import { useAuthStore } from '../../auth/store/authStore'
import { listPoliceAccounts, type PoliceAccountRow } from '../../police/api/accountManagement'
import ResetPoliceAccountPasswordDialog from '../../police/components/ResetPoliceAccountPasswordDialog'
import ManagerTabs from '../components/ManagerTabs'

// [본사] 관리자 탭 "게스트"(#③, 2026-09-17 설계 확정) — 경찰(#①) 쪽과 같은
// listPoliceAccounts를 재사용하되 게스트 노드(levelName==='게스트')만 필터.
// 전국 게스트를 한 화면에서 보는 건 본사(시스템/운영관리자)만 가능 — 경찰서별
// 게스트 관리(발급/조회권 수정/삭제)는 여전히 각 경찰서의 게스트 계정 관리
// 화면(#②) 소관이고, 여긴 초기화 액션만 제공한다.
//
// 이름·역할 컬럼 제외(2026-09-17 사용자 결정) — 게스트는 userName·codeName이
// 전부 "게스트" 고정값이라 이 탭 안에서는 무의미한 데이터다. 소속도 전부 본청
// 산하라 본청 표기 없이 지방청/경찰서 2컬럼으로만 보여준다.
const QUERY_KEY = ['police-accounts']

function GuestAccountsTab() {
  const user = useAuthStore((state) => state.user)
  const accountsQuery = useQuery({ queryKey: QUERY_KEY, queryFn: listPoliceAccounts })

  // 검색어만 URL 쿼리(?q=)에 동기화 — 서버 API에 파라미터가 없어 클라이언트
  // 필터는 그대로 둔다(docs/architecture.md "상태관리", 2026-09-18 배치 B). 엔터/
  // 검색버튼을 눌러야 커밋(IME 조합 깨짐 방지).
  const { value: search, draft, setDraft, commit } = useUrlSearchInput('q')
  const [resetTarget, setResetTarget] = useState<PoliceAccountRow | null>(null)

  const guests = (accountsQuery.data ?? []).filter((a) => a.levelName === '게스트')
  const filtered = guests.filter(
    (a) =>
      !search.trim() ||
      a.loginId.includes(search.trim()) ||
      (a.regionName ?? '').includes(search.trim()) ||
      (a.stationName ?? '').includes(search.trim()),
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
        <h1 className="text-xl font-bold text-foreground">관리자 계정 관리</h1>
      </div>

      <ManagerTabs active="게스트" />

      <div className="hidden xl:flex xl:items-center xl:justify-end">
        <SearchInput
          draft={draft}
          onDraftChange={setDraft}
          onCommit={commit}
          placeholder="소속·아이디 검색"
          aria-label="소속·아이디 검색"
          className="xl:w-64"
        />
      </div>

      {accountsQuery.isLoading && <ListSkeleton columns={3} />}
      {accountsQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">게스트 목록을 불러오지 못했습니다</p>
      )}
      {accountsQuery.isSuccess && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">게스트 계정이 없습니다</p>
      )}

      {accountsQuery.isSuccess && filtered.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>지방청</TableHead>
                  <TableHead>경찰서</TableHead>
                  <TableHead>아이디</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.userSeq}>
                    <TableCell>{a.regionName ?? '-'}</TableCell>
                    <TableCell>{a.stationName ?? '-'}</TableCell>
                    <TableCell>{a.loginId}</TableCell>
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
                  <span className="text-sm font-bold text-foreground">{a.loginId}</span>
                  {menuFor(a)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[a.regionName, a.stationName].filter(Boolean).join(' · ')}
                </div>
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

export default GuestAccountsTab
