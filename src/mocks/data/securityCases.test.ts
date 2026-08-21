import { describe, expect, it } from 'vitest'
import { assignManager, issueSecurityCode, securityCases } from './securityCases'

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
    const updated = assignManager(target.id, '김민수')

    expect(updated).not.toBeNull()
    expect(updated!.status).toBe('배정')
    expect(updated!.assignee).toBe('김민수')
    expect(updated!.securityCode).toMatch(/^ST\d{3}$/)
  })

  it('이미 배정된 건은 다시 배정할 수 없다', () => {
    const target = securityCases.find((c) => c.status === '접수')!
    assignManager(target.id, '김민수')

    expect(assignManager(target.id, '이영희')).toBeNull()
  })

  it('존재하지 않는 건은 null을 반환한다', () => {
    expect(assignManager('case-does-not-exist', '김민수')).toBeNull()
  })
})
