import { http, HttpResponse } from 'msw'
import { companyAccounts } from '../data/accounts'

function companyAccountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return companyAccounts.find((a) => a.id === accountId)
}

export const managerHandlers = [
  http.get('/api/managers', ({ request }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const managers = companyAccounts
      .filter((a) => a.role === '본부관리자')
      .map((a) => ({ id: a.id, name: a.name, branch: a.branch, assignedCount: a.assignedCount ?? 0 }))
    return HttpResponse.json(managers)
  }),
]
