import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

interface DetailHeaderProps {
  // "메뉴명 / 현재 항목" 형태의 경로 표시 텍스트. 클릭 이동은 하지 않는다(왼쪽 화살표 버튼 담당).
  breadcrumb: string
  // 히스토리가 없어 뒤로 갈 수 없을 때(주소창 직접 진입 등) 이동할 상위 목록 경로.
  fallbackTo: string
}

// 공용 상세 페이지 헤더 — 왼쪽 화살표(뒤로가기) 버튼 + 경로 텍스트.
function DetailHeader({ breadcrumb, fallbackTo }: DetailHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  function goBack() {
    // react-router는 첫 진입(뒤로 갈 히스토리 없음)이면 location.key가 'default'다.
    if (location.key === 'default') navigate(fallbackTo)
    else navigate(-1)
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={goBack}
        aria-label="뒤로 가기"
        className="-ml-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <p className="text-xs text-muted-foreground">{breadcrumb}</p>
    </div>
  )
}

export default DetailHeader
