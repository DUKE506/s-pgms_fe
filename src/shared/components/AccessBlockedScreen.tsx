import { FileX } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

interface AccessBlockedScreenProps {
  // 문장에 들어갈 명사 — "경호건" / "이력" 등. "조회 권한이 없거나 존재하지 않는
  // {label}입니다" 한 문장으로 403(스코프 차단)·404(존재하지 않음)를 구분 없이 안내한다
  // (둘 다 사용자 입장에선 취할 행동이 "뒤로가기"뿐이라 원인을 굳이 구분해 보여줄 필요가
  // 없다는 판단, 2026-09-11).
  label: string
  // 히스토리가 없어 뒤로 갈 수 없을 때(주소창 직접 진입 등) 이동할 상위 목록 경로.
  fallbackTo: string
}

// URL 직접 접근 스코프 차단(403/404) 공용 화면 — shared/api/errors.ts::isNotFoundOrForbidden로
// 판별한 상세 조회 화면(경호상세·이력상세)이 기존 인라인 에러 문구 대신 이걸 띄운다.
function AccessBlockedScreen({ label, fallbackTo }: AccessBlockedScreenProps) {
  const navigate = useNavigate()
  const location = useLocation()

  function goBack() {
    // react-router는 첫 진입(뒤로 갈 히스토리 없음)이면 location.key가 'default'다
    // (shared/components/DetailHeader와 동일한 판별).
    if (location.key === 'default') navigate(fallbackTo)
    else navigate(-1)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center sm:p-8">
      <FileX className="size-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        조회 권한이 없거나 존재하지 않는 {label}입니다
      </p>
      <Button type="button" variant="outline" onClick={goBack} className="mt-1">
        뒤로가기
      </Button>
    </main>
  )
}

export default AccessBlockedScreen
