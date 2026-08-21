import { http, HttpResponse } from 'msw'
import { companyAccounts, policeAccounts } from '../data/accounts'
import { assignManager, createSecurityCase, securityCases } from '../data/securityCases'
import type { SecurityCaseCreateInput } from '../../features/police/types/securityCase'

function accountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return policeAccounts.find((a) => a.id === accountId)
}

function companyAccountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return companyAccounts.find((a) => a.id === accountId)
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

  http.get('/api/security-cases', ({ request }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const status = new URL(request.url).searchParams.get('status')
    const list = status ? securityCases.filter((c) => c.status === status) : securityCases
    return HttpResponse.json(list)
  }),

  http.post('/api/security-cases/:id/assign', async ({ request, params }) => {
    const account = companyAccountFromAuthHeader(request)
    if (!account) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const { managerId } = (await request.json()) as { managerId: string }
    const manager = companyAccounts.find((a) => a.id === managerId && a.role === '본부관리자')
    if (!manager) {
      return HttpResponse.json({ message: '담당자를 찾을 수 없습니다' }, { status: 400 })
    }

    const updated = assignManager(params.id as string, manager.name)
    if (!updated) {
      return HttpResponse.json({ message: '배정할 수 없는 상태입니다' }, { status: 409 })
    }

    return HttpResponse.json(updated)
  }),
]
