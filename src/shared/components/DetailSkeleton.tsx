import { Skeleton } from '@/components/ui/skeleton'

// 상세 화면 헤더 줄(관리번호 제목 + 상태뱃지) 스켈레톤 — DetailHeader(브레드크럼)는
// 데이터 없이도 렌더 가능해서 대상에서 제외.
function DetailTitleSkeleton() {
  return (
    <div className="flex items-center gap-3.5">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-5 w-14 rounded-md" />
    </div>
  )
}

// 경호건류 상세(경찰/본사/이력) 상단 5단계 진행 스테퍼(StatusStepper) 자리 —
// 어느 단계인지 아직 몰라 강조 없이 중립 톤으로만 뼈대를 그린다.
function StatusStepperSkeleton() {
  return (
    <div className="flex items-center rounded-xl border border-border bg-card px-5 py-5.5 sm:px-7">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-1 items-center last:flex-initial">
          <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 sm:w-24">
            <Skeleton className="size-6 rounded-full sm:size-7" />
            <Skeleton className="h-2.5 w-8" />
          </div>
          {i < 4 && <div className="h-0.5 flex-1 bg-border" />}
        </div>
      ))}
    </div>
  )
}

// CaseBaseInfoCard 등 "라벨+값" 그리드 카드 한 장 분량 뼈대.
function DetailSectionSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5.5">
      <Skeleton className="mb-4 h-4 w-20" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

interface DetailSkeletonProps {
  // 본문 카드(CaseBaseInfoCard 등) 개수 — 화면마다 카드 수가 달라 prop화.
  sections?: number
  // 근무자 패널 등 우측 사이드바가 있는 화면(xl 기준 좌우 배치)인지.
  withSidebar?: boolean
}

// 상세 화면 본문(카드 목록 + 사이드바) 스켈레톤. 헤더/스테퍼는 화면 성격에 따라
// 필요한 것만 골라 쓸 수 있도록 별도 export로 둔다.
function DetailSkeleton({ sections = 2, withSidebar = false }: DetailSkeletonProps) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="flex flex-1 flex-col gap-5">
        {Array.from({ length: sections }).map((_, i) => (
          <DetailSectionSkeleton key={i} />
        ))}
      </div>
      {withSidebar && (
        <div className="w-full shrink-0 rounded-xl border border-border bg-card p-5.5 xl:w-80">
          <Skeleton className="mb-4 h-4 w-16" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailSkeleton
export { DetailTitleSkeleton, StatusStepperSkeleton, DetailSectionSkeleton }
