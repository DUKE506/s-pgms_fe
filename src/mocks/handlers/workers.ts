import { http, HttpResponse } from 'msw'
import { companyAccounts } from '../data/accounts'
import { allPoliceLoginAccounts } from '../data/guests'
import { createWorker, workers } from '../data/workers'
import type { WorkerCreateInput } from '../../features/company/api/workers'

function companyAccountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return companyAccounts.find((a) => a.id === accountId)
}

function policeAccountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return allPoliceLoginAccounts().find((a) => a.id === accountId)
}

export const workerHandlers = [
  // 화면 5(경찰 상세)의 근무자 배정 패널이 이름/전화번호 조회에 쓰므로 경찰
  // 계정도 허용한다.
  http.get('/api/workers', ({ request }) => {
    if (!companyAccountFromAuthHeader(request) && !policeAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }
    return HttpResponse.json(workers)
  }),

  http.post('/api/workers', async ({ request }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const input = (await request.json()) as WorkerCreateInput
    const record = createWorker(input)
    return HttpResponse.json(record, { status: 201 })
  }),
]
