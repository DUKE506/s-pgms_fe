// 근무자 상세 화면의 "근무 이력" mock 데이터.
//
// 실제 백엔드: GET /api/v1/Guard/Stec/W/GetGuardSchedule?guardSeq=&fromDate=&toDate=
// (2026-09-10 프로브). 응답 data = 평면 배열, 하루당 한 항목:
//   { guardSeq, name, dates: "YYYY-MM-DD", schdules: [{ startDt, endDt, isWork }] }
// - 필드명이 schdules(오타, schedules 아님) — 실 응답 그대로 둔다.
// - 여러 경호건에 걸쳐도 날짜로 모인다. 어느 경호건인지·부서는 응답에 없다.
// - 근무가 없으면 빈 배열. isWork=false는 휴무.
// 데이터 연동은 추후 — 지금은 UI 목업용 fixture다.
import { workers } from './workers'

export interface GuardScheduleShift {
  startDt: string
  endDt: string
  isWork: boolean
}

export interface GuardScheduleDay {
  guardSeq: number
  name: string
  dates: string
  schdules: GuardScheduleShift[]
}

function iso(date: string, time: string) {
  return `${date}T${time}:00`
}

// 시작일부터 dayCount일간, 주중은 근무(09:00~18:00) 주말은 휴무로 채운 fixture.
// idx가 midDoubleAt이면 그날 근무를 2건(오전/오후)으로 쪼갠다(실 데이터에서
// 같은 날 여러 조 배정이 관측됨).
function buildDays(
  guardSeq: number,
  name: string,
  startDate: string,
  dayCount: number,
  midDoubleAt: number[] = [],
): GuardScheduleDay[] {
  const days: GuardScheduleDay[] = []
  const cursor = new Date(startDate)
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(cursor)
    d.setDate(cursor.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    if (weekend) {
      days.push({ guardSeq, name, dates: dateStr, schdules: [{ startDt: iso(dateStr, '00:00'), endDt: iso(dateStr, '00:00'), isWork: false }] })
    } else if (midDoubleAt.includes(i)) {
      days.push({
        guardSeq,
        name,
        dates: dateStr,
        schdules: [
          { startDt: iso(dateStr, '09:00'), endDt: iso(dateStr, '13:00'), isWork: true },
          { startDt: iso(dateStr, '14:00'), endDt: iso(dateStr, '20:00'), isWork: true },
        ],
      })
    } else {
      days.push({ guardSeq, name, dates: dateStr, schdules: [{ startDt: iso(dateStr, '09:00'), endDt: iso(dateStr, '18:00'), isWork: true }] })
    }
  }
  return days
}

function seqOf(id: string) {
  return Number(id.replace(/\D/g, '')) || 0
}

// worker-1(최민준): 8/20~9/30 넉넉히 · worker-2(정우진): 9월만 · worker-3(이서연): 최근 2주
// 나머지 근무자는 근무 이력 없음(빈 배열) — 실 API도 그렇게 준다.
const w1 = workers.find((w) => w.id === 'worker-1')
const w2 = workers.find((w) => w.id === 'worker-2')
const w3 = workers.find((w) => w.id === 'worker-3')

export const guardSchedules: Record<string, GuardScheduleDay[]> = {
  ...(w1 ? { 'worker-1': buildDays(seqOf(w1.id), w1.name, '2026-08-20', 42, [7, 21]) } : {}),
  ...(w2 ? { 'worker-2': buildDays(seqOf(w2.id), w2.name, '2026-09-01', 21) } : {}),
  ...(w3 ? { 'worker-3': buildDays(seqOf(w3.id), w3.name, '2026-09-15', 14) } : {}),
  // 실백엔드 GetGuardList가 주는 guardSeq(김가드 13·이가드 14)로도 조회되게 둔다 —
  // 목업 검증(run-s-pgms)이 실백엔드 계정으로 근무자 목록을 받아오기 때문. 데이터
  // 연동 시 이 경로 전체가 GetGuardSchedule로 대체된다.
  '13': buildDays(13, '김가드', '2026-08-20', 42, [7, 21]),
  '14': buildDays(14, '이가드', '2026-09-01', 21),
}
