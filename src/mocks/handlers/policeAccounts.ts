import { http, HttpResponse } from 'msw'
import { companyAccounts, policeAccounts } from '../data/accounts'
import { resetPoliceAccountPasswordDouble, scopedTreeFor } from '../data/policeAccountTree'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — [경찰 계정
// 관리 #①②·본사 관리자 탭 #③] 실제 백엔드(User/Stec/W/GetPoliceUserList·
// ResetPassword)로 연동 완료됐다(2026-09-17 실측, 응답 샘플: docs/
// backend-integration/responses/User-Stec-GetPoliceUserList.md·
// User-Stec-ResetPassword.md). 브라우저 dev에서는 이 경로를 MSW 미등록으로
// 두고 vite 프록시가 실제 백엔드로 보낸다. 여기서는 실제 응답 shape을 흉내내
// vitest가 오프라인으로 매핑 로직을 검증하게 한다.
function callerFromBearer(request: Request): { role: string; loginId: string } | undefined {
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  const account = [...policeAccounts, ...companyAccounts].find((a) => a.id === accountId)
  return account ? { role: account.role, loginId: account.id } : undefined
}

export const policeAccountHandlers = [
  http.get('/api/v1/User/Stec/W/GetPoliceUserList', ({ request }) => {
    const caller = callerFromBearer(request)
    if (!caller) {
      return HttpResponse.json({ message: '인증이 필요합니다.', data: null, code: 401 }, { status: 401 })
    }
    const data = scopedTreeFor(caller.role, caller.loginId)
    return HttpResponse.json({ message: '요청이 정상 처리되었습니다.', data, code: 200 })
  }),

  http.patch('/api/v1/User/Stec/W/ResetPassword', async ({ request }) => {
    const body = (await request.json()) as { userSeq: number }
    const ok = resetPoliceAccountPasswordDouble(Number(body.userSeq))
    if (!ok) {
      return HttpResponse.json(
        { message: '계정을 찾을 수 없습니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    return HttpResponse.json({ message: '요청이 정상 처리되었습니다.', data: true, code: 200 })
  }),
]
