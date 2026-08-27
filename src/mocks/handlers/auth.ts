import { http, HttpResponse } from 'msw'
import { companyAccounts, type Account } from '../data/accounts'
import { allPoliceLoginAccounts } from '../data/guests'

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

    return HttpResponse.json({ user: toAuthUser(account), ...issueTokens(account.id) })
  })
}

export const authHandlers = [
  loginHandler('/api/auth/police/login', allPoliceLoginAccounts),
  loginHandler('/api/auth/company/login', () => companyAccounts),

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
