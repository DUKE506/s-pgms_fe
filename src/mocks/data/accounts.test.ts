import { describe, expect, it } from 'vitest'
import {
  changeCompanyAccountPassword,
  companyAccounts,
  resetCompanyAccountPassword,
  updateCompanyAccountInfo,
} from './accounts'

describe('updateCompanyAccountInfo', () => {
  it('이름과 연락처를 갱신한다', () => {
    const updated = updateCompanyAccountInfo('hqmanager4', {
      name: '서지훈2',
      phone: '010-9999-0000',
    })

    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('서지훈2')
    expect(updated!.phone).toBe('010-9999-0000')
    expect(companyAccounts.find((a) => a.id === 'hqmanager4')!.name).toBe('서지훈2')
  })

  it('존재하지 않는 계정은 null을 반환한다', () => {
    expect(updateCompanyAccountInfo('no-such-account', { name: 'x' })).toBeNull()
  })
})

describe('resetCompanyAccountPassword', () => {
  it('비밀번호를 아이디와 동일한 값으로 재설정하고 강제 변경 플래그를 세운다', () => {
    const updated = resetCompanyAccountPassword('hqmanager3')

    expect(updated).not.toBeNull()
    expect(updated!.password).toBe('hqmanager3')
    expect(updated!.mustChangePassword).toBe(true)
  })

  it('존재하지 않는 계정은 null을 반환한다', () => {
    expect(resetCompanyAccountPassword('no-such-account')).toBeNull()
  })
})

describe('changeCompanyAccountPassword', () => {
  it('비밀번호를 교체하고 강제 변경 플래그를 해제한다', () => {
    resetCompanyAccountPassword('hqmanager2')
    const updated = changeCompanyAccountPassword('hqmanager2', 'brandNewPass1')

    expect(updated).not.toBeNull()
    expect(updated!.password).toBe('brandNewPass1')
    expect(updated!.mustChangePassword).toBe(false)
  })

  it('존재하지 않는 계정은 null을 반환한다', () => {
    expect(changeCompanyAccountPassword('no-such-account', 'x')).toBeNull()
  })
})
