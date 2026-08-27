import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { getSecurityCaseHistoryDetail } from '../api/history'
import { listWorkers } from '../api/workers'
import { computeCaseHistorySummary } from '../lib/historySummary'
import type { MeasurePeriod } from '../types/securityCase'

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

function formatMeasure(items: string[], period: MeasurePeriod | null | undefined): string {
  if (items.length === 0) return ''
  const joined = items.join(', ')
  if (!period?.startDate || !period.endDate) return joined
  return `${joined} (${formatDate(period.startDate)} ~ ${formatDate(period.endDate)})`
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value || '-'}</div>
    </div>
  )
}

// 화면 8h/8hm: 종결 이력 상세. 취소 건은 목업에 전용 화면이 없어 같은 템플릿을
// 재사용하되 우측 카드만 "종결 정보" 대신 "취소 정보"로 바꾼다(2026-08-27 결정).
// 취소는 배정 단계에서 바로 전환돼 baseInfo/workSchedule이 없으므로 대상자·배치
// 장소·경찰관정보(접수 시점부터 있는 데이터)만 표시하고, 경호시작/종료/총경호
// 시간은 목록과 같은 규칙으로 "-" 처리, 근무자 배정 이력은 빈 상태 문구로 대체한다.
// 레이아웃은 본사 이력 상세(features/company/pages/HistoryDetailPage)와 통일해
// 기본정보를 좌측, 종결/취소 정보를 우측에 나란히 배치한다(2026-08-27, 사용자
// 요청). 기본정보에는 사건유형(caseType)과 5개 조치(안전/긴급응급/잠정/긴급임시/
// 임시조치)도 함께 표시 — 사건유형은 접수 시점부터 있는 데이터, 5개 조치는
// baseInfo가 있는 종결 건만 실값이고 취소 건은 baseInfo 자체가 없어 "-".
function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const caseQuery = useQuery({
    queryKey: ['security-case-history', id],
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
  const { totalHours, workers: workerSummaries } = computeCaseHistorySummary(c.workSchedule)
  const baseInfo = c.baseInfo

  return (
    <main className="flex flex-col gap-5 p-4 pb-10 sm:p-8">
      <p className="text-xs text-muted-foreground">{c.policeStation} / 이력 조회</p>

      <div className="flex flex-wrap items-center gap-3.5">
        <h1 className="text-xl font-bold text-foreground">{managementNumber}</h1>
        <StatusBadge status={c.status} />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="rounded-xl border border-border bg-card p-5.5">
            <div className="mb-4 text-sm font-bold text-foreground">기본정보</div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="대상자명" value={c.subject.nameInitial} />
              <Field label="사건유형" value={c.caseType} />
              <Field label="경찰관 정보" value={c.policeContact.victimOfficer} />
              <Field label="경호시작" value={isCanceled ? '' : formatDate(c.startDate)} />
              <Field label="경호종료" value={isCanceled ? '' : formatDate(c.endDate)} />
              <Field label="총경호시간" value={isCanceled ? '' : formatHours(totalHours)} />
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:justify-between">
              <Field
                label="안전조치"
                value={formatMeasure(baseInfo?.safetyMeasures ?? [], baseInfo?.safetyMeasuresPeriod)}
              />
              <Field
                label="긴급응급조치"
                value={formatMeasure(baseInfo?.emergencyMeasures ?? [], baseInfo?.emergencyMeasuresPeriod)}
              />
              <Field
                label="잠정조치"
                value={formatMeasure(baseInfo?.provisionalMeasures ?? [], baseInfo?.provisionalMeasuresPeriod)}
              />
              <Field
                label="긴급임시조치"
                value={formatMeasure(
                  baseInfo?.emergencyTempMeasures ?? [],
                  baseInfo?.emergencyTempMeasuresPeriod,
                )}
              />
              <Field
                label="임시조치"
                value={formatMeasure(baseInfo?.temporaryMeasures ?? [], baseInfo?.temporaryMeasuresPeriod)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5.5">
            <div className="mb-4 text-sm font-bold text-foreground">근무자 배정 이력</div>
            {workerSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">배정된 근무자가 없습니다</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-2 text-[11px] font-semibold text-muted-foreground">
                  <span>근무자</span>
                  <span>근무일수</span>
                  <span>총근무시간</span>
                </div>
                {workerSummaries.map((w) => {
                  const worker = workers.find((worker) => worker.id === w.workerId)
                  return (
                    <div key={w.workerId} className="grid grid-cols-3 gap-2 py-1.5 text-sm text-foreground">
                      <span className="font-bold">{worker?.name ?? w.workerId}</span>
                      <span>{w.workedDays}일</span>
                      <span>{formatHours(w.totalHours)}</span>
                    </div>
                  )
                })}
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
