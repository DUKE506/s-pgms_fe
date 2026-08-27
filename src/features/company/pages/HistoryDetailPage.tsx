import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { getSecurityCaseHistoryDetail } from '../../police/api/history'
import { listWorkers } from '../api/workers'
import BaseInfoSummaryCard from '../components/BaseInfoSummaryCard'
import ScheduleSection from '../components/ScheduleSection'

function formatDate(dateLike: string) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value || '-'}</div>
    </div>
  )
}

// 화면 12: 본사 이력 상세. 종결 건은 본사 상세화면(SecurityCaseDetailPage) 레이아웃을
// 재사용하되 조회 전용으로 — 액션 버튼과 첨부(경호계획서·개인정보동의서·파기확인서
// 업로드 UI)는 전부 제거하고, 근무 스케줄은 정산 참고용으로 남긴다. 배치장소(주거지/
// 직장)는 피해자 개인정보라 종결 건도 취소 건과 동일하게 숨긴다(2026-08-27 결정).
// 취소 건은 baseInfo/workSchedule 자체가 없어(배정 단계에서 바로 전환) 경찰 이력
// 상세와 같은 축소된 카드를 쓴다.
function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const caseQuery = useQuery({
    queryKey: ['company-history-detail', id],
    queryFn: () => getSecurityCaseHistoryDetail(id!),
    enabled: Boolean(id),
  })
  const workersQuery = useQuery({ queryKey: ['workers'], queryFn: listWorkers })

  if (caseQuery.isLoading || workersQuery.isLoading) {
    return (
      <main className="p-4 sm:p-8">
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    )
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <main className="p-4 sm:p-8">
        <p className="py-8 text-center text-sm text-destructive">이력을 불러오지 못했습니다</p>
      </main>
    )
  }

  const c = caseQuery.data
  const workers = workersQuery.data ?? []
  const isCanceled = c.status === '취소'
  const managementNumber = formatManagementNumber(c.receiptNumber, c.securityCode)

  return (
    <main className="flex flex-col gap-5 p-4 pb-10 sm:p-8">
      <p className="text-xs text-muted-foreground">이력 조회 / {managementNumber}</p>

      <div className="flex flex-wrap items-center gap-3.5">
        <h1 className="text-xl font-bold text-foreground">{managementNumber}</h1>
        <StatusBadge status={c.status} />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {isCanceled ? (
            <div className="rounded-xl border border-border bg-card p-5.5">
              <div className="mb-4 text-sm font-bold text-foreground">기본정보</div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Field label="대상자명" value={c.subject.nameInitial} />
                <Field label="사건유형" value={c.caseType} />
                <Field label="관할경찰서" value={c.policeStation} />
                <Field label="경찰관 정보" value={c.policeContact.victimOfficer} />
              </div>
            </div>
          ) : (
            <>
              <BaseInfoSummaryCard securityCase={c} workers={workers} hidePlacement />
              {c.workSchedule && (
                <ScheduleSection securityCase={c} workers={workers} readOnly />
              )}
            </>
          )}
        </div>

        <div className="w-full rounded-xl border border-border bg-card p-6 xl:w-96 xl:shrink-0">
          {isCanceled ? (
            <>
              <div className="mb-3.5 text-sm font-bold text-foreground">취소 정보</div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">취소일자</span>
                  <span className="font-semibold text-foreground">
                    {c.canceledAt ? formatDate(c.canceledAt) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="shrink-0 text-muted-foreground">취소사유</span>
                  <span className="text-right font-semibold text-foreground">
                    {c.cancelReason || '-'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3.5 text-sm font-bold text-foreground">종결 정보</div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">종결일자</span>
                  <span className="font-semibold text-foreground">
                    {c.closedAt ? formatDate(c.closedAt) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="shrink-0 text-muted-foreground">종결 사유</span>
                  <span className="text-right font-semibold text-foreground">
                    {c.closureReason ?? '-'}
                    {c.closureReason === '기타' && c.closureReasonDetail
                      ? ` (${c.closureReasonDetail})`
                      : ''}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default HistoryDetailPage
