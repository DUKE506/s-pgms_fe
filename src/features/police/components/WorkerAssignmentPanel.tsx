import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Phone } from 'lucide-react'
import type { Worker } from '../../company/api/workers'
import type { SecurityCase } from '../types/securityCase'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function toDateOnly(iso: string) {
  return iso.slice(0, 10)
}

// UTC 기준으로 계산 — 로컬 타임존에서 계산하면 날짜가 밀리는 문제가 있다
// (mocks/data/securityCases.ts의 nextDate와 동일한 패턴, PeriodRequestDialog
// 참고).
function addDays(dateOnly: string, days: number): string {
  const d = new Date(`${dateOnly}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return toDateOnly(d.toISOString())
}

function formatDateWithWeekday(dateOnly: string) {
  const d = new Date(`${dateOnly}T00:00:00`)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd} (${WEEKDAYS[d.getDay()]})`
}

function formatDateShort(dateOnly: string) {
  const d = new Date(`${dateOnly}T00:00:00`)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function defaultDate(startDate: string, endDate: string): string {
  const today = toDateOnly(new Date().toISOString())
  return today >= startDate && today <= endDate ? today : startDate
}

interface WorkerAssignmentPanelProps {
  securityCase: SecurityCase
  workers: Worker[]
}

// 목업(s5) 우측 "근무자 배정" 카드 — 경찰서는 배치기간 내 일자를 넘겨보며
// 그날 근무자 이름/시간/연락처만 조회한다(배정 변경은 본사 화면 전용, 안내문구
// 그대로 유지).
function WorkerAssignmentPanel({ securityCase, workers }: WorkerAssignmentPanelProps) {
  const { startDate, endDate, workSchedule } = securityCase
  const [selectedDate, setSelectedDate] = useState(() => defaultDate(startDate, endDate))

  if (!workSchedule || workSchedule.days.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-center xl:w-[380px] xl:shrink-0">
        <Clock className="size-7 text-muted-foreground/40" />
        <p className="text-xs font-medium text-muted-foreground">아직 근무 일정이 등록되지 않았습니다</p>
      </div>
    )
  }

  const day = workSchedule.days.find((d) => d.date === selectedDate)
  const assignments = (day?.groups ?? [])
    .flatMap((g) => g.assignments)
    .filter((a) => !a.isOff)

  return (
    <div className="w-full rounded-xl border border-border bg-card p-6 xl:w-[380px] xl:shrink-0">
      <div className="mb-3.5 text-sm font-bold text-foreground">근무자 배정</div>
      <div className="mb-4.5 flex items-center justify-center gap-4 border-b border-border/60 pb-4">
        <button
          type="button"
          aria-label="이전 날짜"
          disabled={selectedDate <= startDate}
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          className="text-foreground disabled:opacity-30"
        >
          <ChevronLeft className="size-4.5" />
        </button>
        <span className="text-sm font-bold text-foreground">{formatDateWithWeekday(selectedDate)}</span>
        <button
          type="button"
          aria-label="다음 날짜"
          disabled={selectedDate >= endDate}
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          className="text-foreground disabled:opacity-30"
        >
          <ChevronRight className="size-4.5" />
        </button>
      </div>

      {assignments.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">이 날짜에 배정된 근무자가 없습니다</p>
      ) : (
        <div className="flex flex-col gap-3">
          {assignments.map((a, i) => {
            const worker = workers.find((w) => w.id === a.workerId)
            return (
              <div key={i} className="flex flex-col gap-2.5 rounded-lg border border-border p-4">
                <div className="text-[15px] font-bold text-foreground">{worker?.name ?? a.workerId}</div>
                <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {a.startTime} ~ {a.endTime}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                    <Phone className="size-3.5 text-muted-foreground" />
                    {worker?.phone ?? '-'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        {securityCase.status === '경호완료'
          ? `경호기간(${formatDateShort(startDate)}~${formatDateShort(endDate)})이 종료되었습니다. 파기확인서 업로드 완료 후 종결 처리할 수 있습니다.`
          : `경호기간(${formatDateShort(startDate)}~${formatDateShort(endDate)}) 내에서만 조회할 수 있습니다. 근무자 배정 변경은 본사 화면에서만 관리됩니다.`}
      </p>
    </div>
  )
}

export default WorkerAssignmentPanel
