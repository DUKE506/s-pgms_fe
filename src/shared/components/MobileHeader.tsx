import { LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MobileHeaderProps {
  userLabel: string
  onLogout: () => void
}

// xl 미만(모바일)에서만 보이는 상단 헤더. 데스크톱 rail의 프로필뱃지/로그아웃
// 버튼이 모바일에는 없어서(하단 플로팅 pill은 메뉴 아이콘 전용) 신설 —
// 화면마다 스크롤되는 콘텐츠 위에 sticky로 고정한다. 로고는 워드마크(Safety Link,
// 2026-08-28)만 모바일 헤더에 우선 적용 — 데스크톱 rail은 별도로 파비콘을 쓸
// 예정이라 이 컴포넌트 범위 밖. 프로필뱃지는 클릭하면 프로필/로그아웃이 담긴
// 드롭다운을 연다(기존 배치요청 목록 등에서 쓰던 DropdownMenu 재사용 — 팝오버와
// 동일한 UX라 별도 Popover 프리미티브 신규 도입은 안 함). 프로필 메뉴는 아직
// 연결할 화면이 없어 현재는 자리만 있고 동작은 없다.
function MobileHeader({ userLabel, onLogout }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-sidebar px-4 py-3.5 xl:hidden">
      <img src="/SafetyLogo_no_bg_white.png" alt="Safety Link" className="h-6 w-auto" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="계정 메뉴"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white"
          >
            {userLabel}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <User />
            프로필
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onLogout}>
            <LogOut />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

export default MobileHeader
