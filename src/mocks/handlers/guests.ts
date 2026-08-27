import { http, HttpResponse } from 'msw'
import { policeAccounts } from '../data/accounts'
import {
  createGuestAccount,
  deleteGuestAccount,
  guestAccounts,
  previewNextGuestId,
  pruneTerminalCaseAssignments,
  updateGuestAccountCases,
} from '../data/guests'
import { securityCases } from '../data/securityCases'

function policeAccountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return policeAccounts.find((a) => a.id === accountId)
}

// 게스트 계정 관리(화면 9/10)는 경찰서(피전) 전용 — 게스트 계정 자신은 이
// 화면에 접근할 수 없다(routes.tsx POLICE_STATION_ONLY와 동일 범위).
export const guestHandlers = [
  http.get('/api/guests', ({ request }) => {
    const account = policeAccountFromAuthHeader(request)
    if (!account || account.role !== '경찰서') {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }
    // 이 기능이 생기기 전에 이미 종결/취소된 건에 할당돼 있던(또는 localStorage에
    // 남은 과거 테스트) 케이스를 조회 시점마다 자가 치유(2026-08-27, 사용자 확인).
    pruneTerminalCaseAssignments(securityCases)
    const list = guestAccounts.filter((g) => g.policeStation === account.name)
    return HttpResponse.json(list)
  }),

  // 발급 모달(화면 10)이 실제로 발급하기 전에 자동생성 아이디를 미리 보여주기
  // 위한 조회 전용 엔드포인트 — 실제 생성(POST)과 같은 로직을 쓰므로 미리보기와
  // 실제 발급 결과가 어긋나지 않는다.
  http.get('/api/guests/next-id', ({ request }) => {
    const account = policeAccountFromAuthHeader(request)
    if (!account || account.role !== '경찰서') {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }
    return HttpResponse.json(previewNextGuestId(account.name))
  }),

  http.post('/api/guests', async ({ request }) => {
    const account = policeAccountFromAuthHeader(request)
    if (!account || account.role !== '경찰서') {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }
    const { caseIds } = (await request.json()) as { caseIds: string[] }
    const record = createGuestAccount(account.name, caseIds)
    return HttpResponse.json(record, { status: 201 })
  }),

  http.put('/api/guests/:id', async ({ request, params }) => {
    const account = policeAccountFromAuthHeader(request)
    if (!account || account.role !== '경찰서') {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }
    const target = guestAccounts.find((g) => g.id === params.id)
    if (!target || target.policeStation !== account.name) {
      return HttpResponse.json({ message: '게스트 계정을 찾을 수 없습니다' }, { status: 404 })
    }
    const { caseIds } = (await request.json()) as { caseIds: string[] }
    const updated = updateGuestAccountCases(params.id as string, caseIds)
    return HttpResponse.json(updated)
  }),

  http.delete('/api/guests/:id', ({ request, params }) => {
    const account = policeAccountFromAuthHeader(request)
    if (!account || account.role !== '경찰서') {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }
    const target = guestAccounts.find((g) => g.id === params.id)
    if (!target || target.policeStation !== account.name) {
      return HttpResponse.json({ message: '게스트 계정을 찾을 수 없습니다' }, { status: 404 })
    }
    deleteGuestAccount(params.id as string)
    return new HttpResponse(null, { status: 204 })
  }),
]
