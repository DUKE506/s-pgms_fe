import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  show: boolean
  // 화면에서 자유롭게 넘기는 동사 — "등록"/"저장"/"삭제"/"승인"/"거부"/"요청" 등.
  // 문구는 "{variant}하는 중..."으로 고정 조합한다.
  variant?: string
}

// 등록/저장/삭제 등 mutation 진행 중 화면 전체를 막는 풀스크린 오버레이(모바일
// 목업 3d 참고). Dialog 안에서 뜨는 경우도 있어 Dialog(z-50)보다 위에 그려지도록
// z-index를 더 높게 둔다.
function LoadingOverlay({ show, variant = '등록' }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-popover px-8 py-7 shadow-lg">
        <Loader2 className="size-7 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">{variant}하는 중...</p>
      </div>
    </div>
  )
}

export default LoadingOverlay
