import type { WorkSchedule } from '../types/securityCase'

export interface WorkerHistorySummary {
  workerId: string
  workedDays: number
  totalHours: number
}

export interface CaseHistorySummary {
  totalHours: number
  workers: WorkerHistorySummary[]
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// 화면 8h: 종결 이력 상세의 "근무자 배정 이력"(근무일수·총근무시간)과 목록의
// "총경호시간" 컬럼 — workSchedule에 실제로 기록된 근무 배정(isOff 제외)을
// 근무자별로 합산해서 계산한다(2026-08-27 결정, 별도 정산 필드를 새로 만들지 않고
// 이미 있는 스케줄 데이터에서 도출).
export function computeCaseHistorySummary(workSchedule?: WorkSchedule): CaseHistorySummary {
  if (!workSchedule) return { totalHours: 0, workers: [] }

  const byWorker = new Map<string, { days: Set<string>; minutes: number }>()
  for (const day of workSchedule.days) {
    for (const group of day.groups) {
      for (const assignment of group.assignments) {
        if (assignment.isOff) continue
        const minutes = toMinutes(assignment.endTime) - toMinutes(assignment.startTime)
        if (minutes <= 0) continue

        const entry = byWorker.get(assignment.workerId) ?? { days: new Set(), minutes: 0 }
        entry.days.add(day.date)
        entry.minutes += minutes
        byWorker.set(assignment.workerId, entry)
      }
    }
  }

  const workers = Array.from(byWorker.entries()).map(([workerId, entry]) => ({
    workerId,
    workedDays: entry.days.size,
    totalHours: entry.minutes / 60,
  }))

  return {
    totalHours: workers.reduce((sum, w) => sum + w.totalHours, 0),
    workers,
  }
}
