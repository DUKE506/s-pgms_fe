import { useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

// 화면 13: 본사 이력 상세. 본사(Stec)용 이력 상세 조회 엔드포인트가 아직 없다 —
// History/Stec/W/GetHistoryDetail은 404, History/Police/W/GetHistoryDetail은 본사
// 토큰에 403(2026-09-08 실측, docs/backend-integration/findings.md / issues.md).
// 목록(GetHistoryList)만 실 API로 연동돼 있고, 상세는 EP가 생기면 붙인다.
// 그때까지 이 화면은 안내만 보여준다(목록 행 클릭 시 진입).
function HistoryDetailPage() {
  const navigate = useNavigate()

  return (
    <main className="flex flex-col gap-5 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <button
        type="button"
        onClick={() => navigate('/admin/history')}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        이력 조회
      </button>

      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-semibold text-foreground">
          이력 상세 조회는 준비 중입니다
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          본사 이력 상세 조회 API가 아직 제공되지 않아 목록만 이용할 수 있습니다.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => navigate('/admin/history')}>
          목록으로 돌아가기
        </Button>
      </div>
    </main>
  )
}

export default HistoryDetailPage
