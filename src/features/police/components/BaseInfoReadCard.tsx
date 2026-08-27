import type { MeasurePeriod, SecurityCase } from '../types/securityCase'

function formatDate(dateLike: string) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
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

interface BaseInfoReadCardProps {
  securityCase: SecurityCase
}

// 목업(s5/s5-recv/s5-assigned/s5-done)의 기본정보 카드 — 경찰서 관점에서는
// 전부 읽기전용이다. 대상자명·경호기간·경찰관정보·배치장소는 접수 시점부터
// 이미 있는 데이터라 상태와 무관하게 실값을 보여준다(목업은 접수 상태에서
// "-"로 그려져 있지만 실제로는 데이터가 존재하므로 더 정확한 쪽을 택함).
// 배치시간과 5개 조치는 본사가 기본정보(baseInfo)를 등록해야 채워진다.
function BaseInfoReadCard({ securityCase }: BaseInfoReadCardProps) {
  const { subject, location, policeContact, baseInfo } = securityCase

  return (
    <div className="rounded-xl border border-border bg-card p-5.5">
      <div className="mb-4 text-sm font-bold text-foreground">기본정보</div>
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Field label="대상자명" value={subject.nameInitial} />
        <Field label="사건유형" value={securityCase.caseType} />
        <Field label="경호시작" value={formatDate(securityCase.startDate)} />
        <Field label="경호종료" value={formatDate(securityCase.endDate)} />
        <Field label="배치시간" value={baseInfo ? `매일 ${baseInfo.workHours}` : ''} />
        <Field label="경찰관 정보" value={policeContact.victimOfficer} />
      </div>
      <div className="border-t border-border/60 pt-4">
        <div className="mb-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          배치장소
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="주거지" value={location.residence} />
          <Field label="직장" value={location.workplace} />
          <Field label="기타1" value={location.etc1} />
          <Field label="기타2" value={location.etc2} />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:justify-between">
        <Field label="안전조치" value={formatMeasure(baseInfo?.safetyMeasures ?? [], baseInfo?.safetyMeasuresPeriod)} />
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
  )
}

export default BaseInfoReadCard
