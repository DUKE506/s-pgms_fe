import { describe, expect, it } from 'vitest'
import { caseTypeToCrimeCode, crimeCodeToCaseType } from './crimeType'
import type { CaseType } from '../../features/police/types/securityCase'

const PAIRS: [CaseType, string][] = [
  ['스토킹', 'stalking'],
  ['가정폭력', 'domestic'],
  ['교제폭력', 'dating'],
  ['협박', 'threat'],
  ['기타', 'etc'],
  ['사건미접수', 'none'],
]

describe('caseTypeToCrimeCode', () => {
  it.each(PAIRS)('%s → %s', (label, code) => {
    expect(caseTypeToCrimeCode(label)).toBe(code)
  })
})

describe('crimeCodeToCaseType', () => {
  it.each(PAIRS)('%s ← %s', (label, code) => {
    expect(crimeCodeToCaseType(code)).toBe(label)
  })

  it('레거시 한글 라벨은 그대로 통과시킨다', () => {
    expect(crimeCodeToCaseType('스토킹')).toBe('스토킹')
    expect(crimeCodeToCaseType('협박')).toBe('협박')
  })

  it('null·빈값·미상 코드는 사건미접수로', () => {
    expect(crimeCodeToCaseType(null)).toBe('사건미접수')
    expect(crimeCodeToCaseType('')).toBe('사건미접수')
    expect(crimeCodeToCaseType(undefined)).toBe('사건미접수')
    expect(crimeCodeToCaseType('unknown_code')).toBe('사건미접수')
  })
})
