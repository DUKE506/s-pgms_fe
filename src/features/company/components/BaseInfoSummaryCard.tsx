import type { Worker } from '../api/workers'
import type { CaseBaseInfo, MeasurePeriod, SecurityCase } from '../../police/types/securityCase'

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
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value || '-'}</div>
    </div>
  )
}

function workerNames(baseInfo: CaseBaseInfo, workers: Worker[], onlyDefault: boolean) {
  const ids = baseInfo.defaultWorkers.filter((w) => !onlyDefault || w.isDefault).map((w) => w.workerId)
  const names = ids.map((id) => {
    const worker = workers.find((w) => w.id === id)
    return worker ? `${worker.name}(${worker.employeeId})` : id
  })
  return names.length > 0 ? names.join(', ') : '-'
}

interface BaseInfoSummaryCardProps {
  securityCase: SecurityCase
  workers: Worker[]
  onEdit: () => void
}

function BaseInfoSummaryCard({ securityCase, workers, onEdit }: BaseInfoSummaryCardProps) {
  const baseInfo = securityCase.baseInfo!

  return (
    <div className="rounded-xl border border-border bg-card p-5.5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-bold text-foreground">
          기본정보 <span className="font-normal text-muted-foreground">(본부관리자 작성)</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
        >
          수정
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="경호대상자" value={securityCase.subject.nameInitial} />
        <Field label="경호시작" value={formatDate(securityCase.startDate)} />
        <Field label="경호종료" value={formatDate(securityCase.endDate)} />
        <Field label="배치시간 (매일)" value={baseInfo.workHours} />
        <Field label="기본 근무자" value={workerNames(baseInfo, workers, true)} />
        <Field
          label="피전 (담당 경찰관)"
          value={
            baseInfo.victimOfficerName
              ? `${baseInfo.victimOfficerName} / ${baseInfo.victimOfficerPhone}`
              : '-'
          }
        />
      </div>

      <div className="mb-4 border-t border-border pt-4">
        <div className="mb-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          배치장소
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="주거지" value={baseInfo.placeResidence} />
          <Field label="직장" value={baseInfo.placeWorkplace} />
          <Field label="기타" value={baseInfo.placeEtc1 || baseInfo.placeEtc2} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
        <Field
          label="안전조치"
          value={formatMeasure(baseInfo.safetyMeasures, baseInfo.safetyMeasuresPeriod)}
        />
        <Field
          label="긴급응급조치"
          value={formatMeasure(baseInfo.emergencyMeasures, baseInfo.emergencyMeasuresPeriod) || '해당 없음'}
        />
        <Field
          label="잠정조치"
          value={formatMeasure(baseInfo.provisionalMeasures, baseInfo.provisionalMeasuresPeriod) || '해당 없음'}
        />
        <Field
          label="긴급임시조치"
          value={
            formatMeasure(baseInfo.emergencyTempMeasures, baseInfo.emergencyTempMeasuresPeriod) ||
            '해당 없음'
          }
        />
        <Field
          label="임시조치"
          value={formatMeasure(baseInfo.temporaryMeasures, baseInfo.temporaryMeasuresPeriod) || '해당 없음'}
        />
      </div>
    </div>
  )
}

export default BaseInfoSummaryCard
