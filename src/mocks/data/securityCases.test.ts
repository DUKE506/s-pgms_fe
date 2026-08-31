import { describe, expect, it } from 'vitest'
import {
  approvePeriodRequest,
  assignManager,
  issueSecurityCode,
  rejectPeriodRequest,
  requestPeriodChange,
  securityCases,
} from './securityCases'

describe('issueSecurityCode', () => {
  it('발급할 때마다 ST + 3자리 일련번호를 순서대로 반환한다', () => {
    const first = issueSecurityCode()
    const second = issueSecurityCode()
    const [firstSeq, secondSeq] = [first, second].map((code) => Number(code.slice(2)))
    expect(first).toMatch(/^ST\d{3}$/)
    expect(secondSeq).toBe(firstSeq + 1)
  })
})

describe('assignManager', () => {
  it('접수 상태 건을 배정 상태로 전환하고 경호코드를 발급한다', () => {
    const target = securityCases.find((c) => c.status === '접수')!
    const updated = assignManager(target.id, 'hqmanager1')

    expect(updated).not.toBeNull()
    expect(updated!.status).toBe('배정')
    expect(updated!.assigneeId).toBe('hqmanager1')
    expect(updated!.securityCode).toMatch(/^ST\d{3}$/)
  })

  it('이미 배정된 건은 다시 배정할 수 없다', () => {
    const target = securityCases.find((c) => c.status === '접수')!
    assignManager(target.id, 'hqmanager1')

    expect(assignManager(target.id, 'hqmanager2')).toBeNull()
  })

  it('존재하지 않는 건은 null을 반환한다', () => {
    expect(assignManager('case-does-not-exist', 'hqmanager1')).toBeNull()
  })
})

// case-seed-7: 경호중, baseInfo+workSchedule(2026-01-05~01-19, 15일) 풀세트가 채워진
// seed(withDemoDetail). 아래 3개 테스트는 순서대로 실행되며 같은 케이스의 상태를
// 이어받는다(assignManager 테스트와 같은 패턴).
describe('approvePeriodRequest / rejectPeriodRequest', () => {
  const caseId = 'case-seed-7'

  it('연장 승인 시 endDate와 workSchedule.days를 새 종료일까지 늘린다', () => {
    requestPeriodChange(caseId, '연장', '2026-01-24')
    const updated = approvePeriodRequest(caseId)

    expect(updated).not.toBeNull()
    expect(updated!.endDate).toBe('2026-01-24')
    expect(updated!.pendingPeriodRequest).toBeUndefined()
    expect(updated!.workSchedule!.days).toHaveLength(20)
    expect(updated!.workSchedule!.days.at(-1)!.date).toBe('2026-01-24')
    expect(updated!.workSchedule!.days.at(-1)!.groups[0].assignments).toEqual(
      expect.arrayContaining([expect.objectContaining({ workerId: 'worker-1' })]),
    )
  })

  it('단축 승인 시 endDate와 workSchedule.days를 새 종료일 이후로 잘라낸다', () => {
    requestPeriodChange(caseId, '단축', '2026-01-20')
    const updated = approvePeriodRequest(caseId)

    expect(updated).not.toBeNull()
    expect(updated!.endDate).toBe('2026-01-20')
    expect(updated!.pendingPeriodRequest).toBeUndefined()
    expect(updated!.workSchedule!.days).toHaveLength(16)
    expect(updated!.workSchedule!.days.at(-1)!.date).toBe('2026-01-20')
  })

  it('거부 시 pendingPeriodRequest만 해제하고 기간/스케줄은 그대로 둔다', () => {
    requestPeriodChange(caseId, '연장', '2026-01-25')
    const before = securityCases.find((c) => c.id === caseId)!
    const daysBefore = before.workSchedule!.days.length

    const updated = rejectPeriodRequest(caseId)

    expect(updated).not.toBeNull()
    expect(updated!.pendingPeriodRequest).toBeUndefined()
    expect(updated!.endDate).toBe('2026-01-20')
    expect(updated!.workSchedule!.days).toHaveLength(daysBefore)
  })

  it('대기 중인 요청이 없으면 승인/거부 모두 null을 반환한다', () => {
    expect(approvePeriodRequest(caseId)).toBeNull()
    expect(rejectPeriodRequest(caseId)).toBeNull()
  })
})
