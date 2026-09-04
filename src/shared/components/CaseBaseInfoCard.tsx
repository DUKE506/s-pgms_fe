import type { MeasurePeriod, SecurityCase } from '@/features/police/types/securityCase'

// 경호건 "기본정보" 조회 카드 — [경찰서] 경호 상세, [본사] 경호 상세, [본사] 이력 상세가
// 공유한다(2026-09-04 통일). 예전엔 피전용 `BaseInfoReadCard`와 본사용
// `BaseInfoSummaryCard`가 따로 있어 필드 목록·라벨·포맷이 조금씩 달랐다.
//
// variant로 갈리는 것은 3가지뿐:
//  - company: 제목에 "(본부관리자 작성)" 부제 + "수정" 버튼
//  - history: 배치장소 숨김(피해자 개인정보라 조직 계층에 넓게 노출 부적절, 2026-08-27)
//  - police: 부제/수정 없음, 배치장소 표시
// 나머지(상단 정보 그리드·배치장소·5개 조치)는 전부 동일하다. 빈 값은 모두 "-".

function formatDate(dateLike: string) {
  if (!dateLike) return ''
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return dateLike
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

// 조치 항목: 선택 항목과 적용기간을 한 줄에 합치지 않고 세로로 쌓는다
// (항목 / 기간). 기간이 없으면 항목만, 항목이 없으면 "-".
function MeasureField({
  label,
  items,
  period,
}: {
  label: string
  items: string[] | undefined
  period: MeasurePeriod | null | undefined
}) {
  const hasPeriod = Boolean(period?.startDate && period?.endDate)
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      {!items || items.length === 0 ? (
        <div className="text-sm font-semibold text-foreground">-</div>
      ) : (
        <>
          <div className="text-sm font-semibold text-foreground">{items.join(', ')}</div>
          {hasPeriod && (
            <div className="text-xs text-muted-foreground">
              {formatDate(period!.startDate)} ~ {formatDate(period!.endDate)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface CaseBaseInfoCardProps {
  securityCase: SecurityCase
  variant: 'police' | 'company' | 'history'
  onEdit?: () => void // company 전용
}

function CaseBaseInfoCard({ securityCase, variant, onEdit }: CaseBaseInfoCardProps) {
  const { subject, location, policeContact, baseInfo } = securityCase
  const isCompany = variant === 'company'
  const hidePlacement = variant === 'history'

  return (
    <div className="rounded-xl border border-border bg-card p-5.5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-bold text-foreground">
          기본정보
          {isCompany && (
            <span className="font-normal text-muted-foreground"> (본부관리자 작성)</span>
          )}
        </div>
        {isCompany && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
          >
            수정
          </button>
        )}
      </div>

      {/* 7필드 / 4열 → 1행: 경호대상자·사건유형·경호시작·경호종료(시작·종료 한 줄),
          2행: 배치시간·피전·수사관. 모바일(2열)에서도 시작·종료가 같은 줄에 온다. */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="경호대상자" value={subject.nameInitial} />
        <Field label="사건유형" value={securityCase.caseType} />
        <Field label="경호시작" value={formatDate(securityCase.startDate)} />
        <Field label="경호종료" value={formatDate(securityCase.endDate)} />
        <Field label="배치시간" value={baseInfo ? `매일 ${baseInfo.workHours}` : ''} />
        <Field label="피전" value={policeContact.victimOfficer} />
        <Field label="수사관" value={policeContact.investigator} />
      </div>

      {!hidePlacement && (
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
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:flex-wrap sm:justify-between">
        <MeasureField
          label="안전조치"
          items={baseInfo?.safetyMeasures}
          period={baseInfo?.safetyMeasuresPeriod}
        />
        <MeasureField
          label="긴급응급조치"
          items={baseInfo?.emergencyMeasures}
          period={baseInfo?.emergencyMeasuresPeriod}
        />
        <MeasureField
          label="잠정조치"
          items={baseInfo?.provisionalMeasures}
          period={baseInfo?.provisionalMeasuresPeriod}
        />
        <MeasureField
          label="긴급임시조치"
          items={baseInfo?.emergencyTempMeasures}
          period={baseInfo?.emergencyTempMeasuresPeriod}
        />
        <MeasureField
          label="임시조치"
          items={baseInfo?.temporaryMeasures}
          period={baseInfo?.temporaryMeasuresPeriod}
        />
      </div>
    </div>
  )
}

export default CaseBaseInfoCard
