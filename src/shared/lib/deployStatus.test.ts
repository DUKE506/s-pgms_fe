import { describe, expect, it } from 'vitest'
import { GUARD_CASE_STATUS_CODE, resolveDeployStatus } from './deployStatus'

describe('resolveDeployStatus', () => {
  it('숫자 코드가 있으면 그걸 상태 소스로 쓴다', () => {
    expect(resolveDeployStatus('경호완료', 2)).toEqual({ status: '경호완료' })
    expect(resolveDeployStatus('아무 문자열', 4)).toEqual({ status: '취소' })
  })

  it('코드가 없으면 statusName 문자열을 그대로 쓴다', () => {
    expect(resolveDeployStatus('배정')).toEqual({ status: '배정' })
    expect(resolveDeployStatus('접수', null)).toEqual({ status: '접수' })
  })

  it('statusName이 "연장"/"단축"이면 코드 유무와 상관없이 경호중 + 대기 타입으로 정규화한다', () => {
    expect(resolveDeployStatus('연장', 1)).toEqual({
      status: '경호중',
      pendingRequestType: '연장',
    })
    expect(resolveDeployStatus('단축')).toEqual({
      status: '경호중',
      pendingRequestType: '단축',
    })
  })

  it('GUARD_CASE_STATUS_CODE는 GUARD_CASE_STATUS_LABEL과 역방향으로 짝이 맞는다', () => {
    for (const [status, code] of Object.entries(GUARD_CASE_STATUS_CODE)) {
      expect(resolveDeployStatus('무시됨', code)).toEqual({ status })
    }
  })
})
