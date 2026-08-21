import { http, HttpResponse } from 'msw'
import { policeAccounts } from '../data/accounts'
import { createSecurityCase } from '../data/securityCases'
import type { SecurityCaseCreateInput } from '../../features/police/types/securityCase'

function accountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return policeAccounts.find((a) => a.id === accountId)
}

export const securityCaseHandlers = [
  http.post('/api/security-cases', async ({ request }) => {
    const account = accountFromAuthHeader(request)
    if (!account) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const input = (await request.json()) as SecurityCaseCreateInput
    const record = createSecurityCase(account.name, input)
    return HttpResponse.json(record, { status: 201 })
  }),
]
