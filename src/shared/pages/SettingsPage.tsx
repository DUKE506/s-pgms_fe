import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useLogout } from '@/features/auth/lib/useLogout'

// 전역 상단 헤더(MobileHeader) 폐기(2026-09-14)로 없어진 로그아웃 진입점을
// 대체하는 화면 — 목업엔 없는 신규 화면. 모바일 하단 플로팅 nav의 설정
// 아이콘에서 진입(팝오버 대신 페이지 이동, 사용자 결정). 경찰/본사 라우트
// (`/settings`·`/admin/settings`) 양쪽에서 이 컴포넌트를 그대로 재사용.
function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const handleLogout = useLogout()

  return (
    <main className="flex min-h-screen flex-col gap-6 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <h1 className="text-xl font-bold text-foreground">설정</h1>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sidebar text-sm font-semibold text-white">
          {user?.name.slice(0, 2)}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">{user?.name}</span>
          <span className="text-xs text-muted-foreground">
            {user?.groupName ? `${user.groupName} · ${user.role}` : user?.role}
          </span>
        </div>
      </div>

      <div className="flex-1" />

      <Button type="button" variant="destructive" onClick={handleLogout} className="w-full">
        로그아웃
      </Button>
    </main>
  )
}

export default SettingsPage
