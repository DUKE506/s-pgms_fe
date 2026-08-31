import { describe, expect, it } from 'vitest'
import { changeGuestAccountPassword, createGuestAccount, guestLoginAccounts } from './guests'

describe('createGuestAccount', () => {
  it('초기 비밀번호를 아이디와 동일하게 설정하고 강제 변경 플래그를 세운다', () => {
    const record = createGuestAccount('강남경찰서', [])

    expect(record.password).toBe(record.name)
    expect(record.mustChangePassword).toBe(true)

    const loginAccount = guestLoginAccounts().find((a) => a.id === record.id)!
    expect(loginAccount.mustChangePassword).toBe(true)
  })
})

describe('changeGuestAccountPassword', () => {
  it('비밀번호를 교체하고 강제 변경 플래그를 해제한다', () => {
    const record = createGuestAccount('강남경찰서', [])
    const updated = changeGuestAccountPassword(record.id, 'brandNewPass1')

    expect(updated).not.toBeNull()
    expect(updated!.password).toBe('brandNewPass1')
    expect(updated!.mustChangePassword).toBe(false)

    const loginAccount = guestLoginAccounts().find((a) => a.id === record.id)!
    expect(loginAccount.password).toBe('brandNewPass1')
    expect(loginAccount.mustChangePassword).toBe(false)
  })

  it('존재하지 않는 계정은 null을 반환한다', () => {
    expect(changeGuestAccountPassword('no-such-guest', 'x')).toBeNull()
  })
})

describe('guestLoginAccounts', () => {
  it('password 필드가 없는 과거 seed 데이터는 이름을 비밀번호로 대체한다', () => {
    const seedGuest = guestLoginAccounts().find((a) => a.id === 'gangnamguest5')!
    expect(seedGuest.password).toBe('GangnamGuest5')
    expect(seedGuest.mustChangePassword).toBeUndefined()
  })
})
