import { http, HttpResponse } from 'msw'
import { companyAccounts } from '../data/accounts'
import { allPoliceLoginAccounts } from '../data/guests'
import { workers } from '../data/workers'

// 근무자 마스터 CRUD(본사 admin)는 실제 백엔드(Guard/Stec/W/*)로 연동 완료 —
// 그 검증은 테스트 전용 더블(mocks/handlers/guard.ts)에서 한다. 여기 남은 GET
// /api/workers 하나는 경호 상세(#9)·이력 상세(#13)가 근무자 이름/연락처
// 조인용으로 아직 읽는 임시 경로(features/company/api/workers.ts
// listCaseJoinWorkers). 그 화면들이 각자 iteration에서 정리한다.

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
  // 경찰 상세의 근무자 배정 패널도 이름/전화번호 조회에 쓰므로 경찰 계정도 허용한다.
  http.get('/api/workers', ({ request }) => {
    if (!companyAccountFromAuthHeader(request) && !policeAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }
    return HttpResponse.json(workers)
  }),
]
