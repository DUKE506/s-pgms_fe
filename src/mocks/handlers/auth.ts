import { http, HttpResponse } from 'msw'
import { changeCompanyAccountPassword, companyAccounts, type Account } from '../data/accounts'
import { allPoliceLoginAccounts, changeGuestAccountPassword } from '../data/guests'

function issueTokens(id: string) {
  const nonce = Math.random().toString(36).slice(2, 8)
  return { accessToken: `access.${id}.${nonce}`, refreshToken: `refresh.${id}.${nonce}` }
}

function parseAccountId(token: string) {
  return token.split('.')[1]
}

function toAuthUser(account: Account) {
  return { id: account.id, name: account.name, role: account.role }
}

function loginHandler(path: string, getAccounts: () => Account[]) {
  return http.post(path, async ({ request }) => {
    const { id, password } = (await request.json()) as { id: string; password: string }
    // 아이디는 대소문자 구분 없이 매칭한다 — 게스트 계정(화면 9/10)의 로그인
    // 아이디는 "GangnamGuest7"처럼 표시용 대소문자 그대로 발급되는데, 저장된
    // 계정 id는 토큰/URL에 쓰기 위해 소문자로 정규화돼 있다(mocks/data/guests.ts).
    // 대소문자를 그대로 강제하면 화면에 보이는 아이디를 그대로 입력해도
    // 로그인이 실패한다(2026-08-27 발견).
    const account = getAccounts().find(
      (a) => a.id.toLowerCase() === id.toLowerCase() && a.password === password,
    )

    if (!account) {
      return HttpResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 },
      )
    }

    // 최초 로그인 강제 비밀번호 변경(게스트 발급/관리자 비밀번호 초기화 직후) —
    // 세션을 발급하지 않고 변경이 필요하다는 것만 알린다. 실제 백엔드의
    // "최초 로그인" 컬럼을 흉내낸 플래그로 판단(mocks/data/accounts.ts 참고).
    if (account.mustChangePassword) {
      return HttpResponse.json({ mustChangePassword: true, id: account.id })
    }

    return HttpResponse.json({ user: toAuthUser(account), ...issueTokens(account.id) })
  })
}

// 최초 로그인 강제 변경 모달 전용 — 일반적인 "비밀번호 변경" API가 아니라
// mustChangePassword가 true인 계정에만 허용된다. 성공해도 세션을 발급하지
// 않고 재로그인을 요구한다(2026-08-31 결정).
function changeInitialPasswordHandler(
  path: string,
  getAccounts: () => Account[],
  applyChange: (id: string, newPassword: string) => { id: string } | null,
) {
  return http.post(path, async ({ request }) => {
    const { id, oldPassword, newPassword } = (await request.json()) as {
      id: string
      oldPassword: string
      newPassword: string
    }
    const account = getAccounts().find(
      (a) => a.id.toLowerCase() === id.toLowerCase() && a.password === oldPassword,
    )
    if (!account || !account.mustChangePassword) {
      return HttpResponse.json({ message: '변경할 수 없는 요청입니다' }, { status: 400 })
    }

    const updated = applyChange(account.id, newPassword)
    if (!updated) {
      return HttpResponse.json({ message: '계정을 찾을 수 없습니다' }, { status: 404 })
    }
    return new HttpResponse(null, { status: 204 })
  })
}

export const authHandlers = [
  loginHandler('/api/auth/police/login', allPoliceLoginAccounts),
  loginHandler('/api/auth/company/login', () => companyAccounts),
  changeInitialPasswordHandler(
    '/api/auth/police/change-initial-password',
    allPoliceLoginAccounts,
    changeGuestAccountPassword,
  ),
  changeInitialPasswordHandler(
    '/api/auth/company/change-initial-password',
    () => companyAccounts,
    changeCompanyAccountPassword,
  ),

  http.post('/api/auth/refresh', async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string }
    const accountId = parseAccountId(refreshToken)
    const account = [...allPoliceLoginAccounts(), ...companyAccounts].find((a) => a.id === accountId)

    if (!account) {
      return HttpResponse.json({ message: '세션이 만료되었습니다' }, { status: 401 })
    }

    return HttpResponse.json(issueTokens(account.id))
  }),
]
