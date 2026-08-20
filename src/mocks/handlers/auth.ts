import { http, HttpResponse } from 'msw'
import { companyAccounts, policeAccounts, type Account } from '../data/accounts'

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

function loginHandler(path: string, accounts: Account[]) {
  return http.post(path, async ({ request }) => {
    const { id, password } = (await request.json()) as { id: string; password: string }
    const account = accounts.find((a) => a.id === id && a.password === password)

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
  loginHandler('/api/auth/police/login', policeAccounts),
  loginHandler('/api/auth/company/login', companyAccounts),

  http.post('/api/auth/refresh', async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string }
    const accountId = parseAccountId(refreshToken)
    const account = [...policeAccounts, ...companyAccounts].find((a) => a.id === accountId)

    if (!account) {
      return HttpResponse.json({ message: '세션이 만료되었습니다' }, { status: 401 })
    }

    return HttpResponse.json(issueTokens(account.id))
  }),
]
