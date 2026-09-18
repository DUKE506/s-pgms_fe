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

// [본사] 관리자 탭 "경찰"(#③, 2026-09-17 설계 확정) — 경찰(#①) 쪽과 같은
// API·평면화 로직을 그대로 재사용(listPoliceAccounts가 호출자 스코프를 서버가
// 알아서 좁혀주므로, 본사 시스템/운영관리자로 호출하면 전국 범위가 온다).
// 게스트 노드(levelName==='게스트')는 별도 탭(GuestAccountsTab)에서 다루므로 뺀다.
// 소속은 전부 본청 산하라 본청 표기 없이 지방청/경찰서 2컬럼으로만 보여준다
// (2026-09-17 사용자 결정).
const QUERY_KEY = ['police-accounts']

function PoliceAccountsTab() {
  const user = useAuthStore((state) => state.user)
  const accountsQuery = useQuery({ queryKey: QUERY_KEY, queryFn: listPoliceAccounts })

  // 검색어만 URL 쿼리(?q=)에 동기화 — 서버 API(GetPoliceUserList)에 파라미터가
  // 없어 클라이언트 필터는 그대로 둔다(docs/architecture.md "상태관리", 2026-09-18
  // 배치 B). 엔터/검색버튼을 눌러야 커밋(IME 조합 깨짐 방지).
  const { value: search, draft, setDraft, commit } = useUrlSearchInput('q')
  const [resetTarget, setResetTarget] = useState<PoliceAccountRow | null>(null)

  const accounts = (accountsQuery.data ?? []).filter((a) => a.levelName !== '게스트')
  const filtered = accounts.filter(
    (a) =>
      !search.trim() ||
      a.userName.includes(search.trim()) ||
      (a.regionName ?? '').includes(search.trim()) ||
      (a.stationName ?? '').includes(search.trim()),
  )

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{user?.name}</p>
        <h1 className="text-xl font-bold text-foreground">관리자 계정 관리</h1>
      </div>

      <ManagerTabs active="경찰" />

      <div className="hidden xl:flex xl:items-center xl:justify-end">
        <SearchInput
          draft={draft}
          onDraftChange={setDraft}
          onCommit={commit}
          placeholder="소속·이름 검색"
          aria-label="소속·이름 검색"
          className="xl:w-64"
        />
      </div>

      {accountsQuery.isLoading && <ListSkeleton columns={6} />}
      {accountsQuery.isError && (
        <p className="py-8 text-center text-sm text-destructive">계정 목록을 불러오지 못했습니다</p>
      )}
      {accountsQuery.isSuccess && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">계정이 없습니다</p>
      )}

      {accountsQuery.isSuccess && filtered.length > 0 && (
        <PoliceAccountsResults accounts={filtered} onResetPassword={setResetTarget} />
      )}

      <ResetPoliceAccountPasswordDialog
        target={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        invalidateQueryKey={QUERY_KEY}
      />
    </main>
  )
}

interface PoliceAccountsResultsProps {
  accounts: PoliceAccountRow[]
  onResetPassword: (account: PoliceAccountRow) => void
}

// 검색창 타이핑(draft)은 이 컴포넌트의 props(accounts)를 안 건드리므로, 부모가
// 매 키 입력마다 리렌더돼도 이 큰 리스트는 다시 그리지 않는다 — 전국 스코프라
// 건수가 많아, 부모와 한 컴포넌트에 있으면 입력마다 테이블 전체가 재조정돼
// 입력이 밀리는 문제가 있었다(2026-09-19 사용자 리포트).
function PoliceAccountsResults({ accounts, onResetPassword }: PoliceAccountsResultsProps) {
  function menuFor(account: PoliceAccountRow) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="더보기">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onResetPassword(account)}>
            <KeyRound />
            비밀번호 초기화
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>지방청</TableHead>
              <TableHead>경찰서</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>아이디</TableHead>
              <TableHead>역할</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.userSeq}>
                <TableCell>{a.regionName ?? '-'}</TableCell>
                <TableCell>{a.stationName ?? '-'}</TableCell>
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
        {accounts.map((a) => (
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
            <div className="text-xs text-muted-foreground">
              {[a.regionName, a.stationName].filter(Boolean).join(' · ') || '-'}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default PoliceAccountsTab
