import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import StatusBadge from '@/shared/components/StatusBadge'
import DetailHeader from '@/shared/components/DetailHeader'
import AccessBlockedScreen from '@/shared/components/AccessBlockedScreen'
import { isNotFoundOrForbidden } from '@/shared/api/errors'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { getCompanyHistoryDetail } from '../api/history'

function formatDate(dateLike: string) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function formatHours(hours: number) {
  return Number.isInteger(hours) ? `${hours}시간` : `${hours.toFixed(1)}시간`
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value || '-'}</div>
    </div>
  )
}

// 화면 13: 본사 이력 상세. 실 API(History/Stec/W/GetHistoryDetail — 2026-09-09 신설).
// 목록이 종결·취소 건만 담으므로 이 화면도 두 상태만 도달한다. 레이아웃은 경찰 이력
// 상세(features/police/pages/HistoryDetailPage)와 통일 — 기본정보 좌측, 종결/취소
// 정보 우측. 근무자별 투입실적은 응답 guards[]에 이름이 인라인이라 별도 조회 없음.
// 사건유형·배치장소는 이 응답에 없어 미표시(exclusions).
function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const caseQuery = useQuery({
    queryKey: ['company-history-detail', id],
    queryFn: () => getCompanyHistoryDetail(id!),
    enabled: Boolean(id),
  })

  const header = <DetailHeader breadcrumb="이력 조회" fallbackTo="/admin/history" />

  if (caseQuery.isLoading) {
    return (
      <main className="flex flex-col gap-5 p-4 sm:p-8">
        {header}
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      </main>
    )
  }

  if (caseQuery.isError && isNotFoundOrForbidden(caseQuery.error)) {
    return <AccessBlockedScreen label="이력" fallbackTo="/admin/history" />
  }

  if (caseQuery.isError || !caseQuery.data) {
    return (
      <main className="flex flex-col gap-5 p-4 sm:p-8">
        {header}
        <p className="py-8 text-center text-sm text-destructive">이력을 불러오지 못했습니다</p>
      </main>
    )
  }

  const c = caseQuery.data
  const isCanceled = c.status === '취소'
  const managementNumber = formatManagementNumber(c.receiptNumber, c.securityCode)
  const totalHours = c.totalGuardMinutes != null ? c.totalGuardMinutes / 60 : 0
  const guardRows = (c.historyGuards ?? []).map((g) => ({
    key: String(g.guardSeq),
    name: g.guardName,
    workedDays: g.workDays,
    totalHours: g.totalMinutes / 60,
  }))

  return (
    <main className="flex flex-col gap-5 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <DetailHeader
        breadcrumb={managementNumber ? `이력 조회 / ${managementNumber}` : '이력 조회'}
        fallbackTo="/admin/history"
      />

      <div className="flex flex-wrap items-center gap-3.5">
        <h1 className="text-xl font-bold text-foreground">{managementNumber}</h1>
        <StatusBadge status={c.status} />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="rounded-xl border border-border bg-card p-5.5">
            <div className="mb-4 text-sm font-bold text-foreground">경호정보</div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="대상자명" value={c.subject.nameInitial} />
              <Field label="경찰서" value={c.policeStation} />
              <Field label="경찰관 정보" value={c.policeContact.victimOfficer} />
              <Field label="경호시작" value={isCanceled ? '' : formatDate(c.startDate)} />
              <Field label="경호종료" value={isCanceled ? '' : formatDate(c.endDate)} />
              <Field label="총경호시간" value={isCanceled ? '' : formatHours(totalHours)} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5.5">
            <div className="mb-4 text-sm font-bold text-foreground">근무자 배정 이력</div>
            {guardRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">배정된 근무자가 없습니다</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-2 text-[11px] font-semibold text-muted-foreground">
                  <span>근무자</span>
                  <span>근무일수</span>
                  <span>총근무시간</span>
                </div>
                {guardRows.map((w) => (
                  <div key={w.key} className="grid grid-cols-3 gap-2 py-1.5 text-sm text-foreground">
                    <span className="font-bold">{w.name}</span>
                    <span>{w.workedDays}일</span>
                    <span>{formatHours(w.totalHours)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
