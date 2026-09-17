import { http, HttpResponse } from 'msw'
import { companyAccounts, policeAccounts } from '../data/accounts'
import { resetPoliceAccountPasswordDouble, scopedTreeFor } from '../data/policeAccountTree'

// [경찰 계정 관리 + 본사 관리자 탭] 신규 API 2종(목록조회/초기화) 더블 —
// 백엔드에 요청은 이미 전달됐고(2026-09-17) 스펙 미확정이라, 아직 mock인
// 화면들과 같은 취급으로 browser.ts에도 노출한다(securityCases/workers와 동일
// 취급 — handlers 배열, testOnlyHandlers 아님). 실제 스펙 도착하면 엔드포인트
// 경로/필드명만 맞춰 이 핸들러와 features/police/api/accountManagement.ts를
// 함께 교체한다.
//
// ⚠️ 인증 스코프는 vitest 더블 목적으로만 정확하다 — useAuthStore.setState로
// 로그인하는 테스트는 accessToken이 `access.<id>.test` 형태라 여기서 역할을
// 정확히 찾아내지만, 실제 브라우저(run-s-pgms 등)는 이미 실백엔드로 로그인해
// 토큰이 이 형태가 아니다. 그 경우 역할을 특정할 수 없으므로 본청 스코프(전체
// 트리)로 폴백한다 — 로그인한 계정과 무관하게 항상 같은 데모 데이터가 뜨는 건
// 의도된 한계다(화면 레이아웃 스캐폴딩 목적, 실 스코프 검증은 실 API 연동 후).
function callerFromBearer(request: Request): { role: string; loginId: string } | undefined {
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  const account = [...policeAccounts, ...companyAccounts].find((a) => a.id === accountId)
  return account ? { role: account.role, loginId: account.id } : undefined
}

export const policeAccountHandlers = [
  // 목록조회(신규, 경로 미확정 — 임시로 User/Police/W/ 네임스페이스에 둠).
  http.get('/api/v1/User/Police/W/GetPoliceAccountTree', ({ request }) => {
    const caller = callerFromBearer(request)
    const data = caller ? scopedTreeFor(caller.role, caller.loginId) : scopedTreeFor('본청', '')
    return HttpResponse.json({ message: 'ok', data, code: 200 })
  }),

  // 초기화(신규, 경로 미확정). 대상 userSeq를 아이디와 동일한 비밀번호로
  // 리셋하고 pwChangedYn=true로 세운다 — 본사 UpdateUser 초기화와 같은 관례.
  http.patch('/api/v1/User/Police/W/ResetPoliceAccountPassword', async ({ request }) => {
    const body = (await request.json()) as { userSeq: number }
    const ok = resetPoliceAccountPasswordDouble(Number(body.userSeq))
    if (!ok) {
      return HttpResponse.json(
        { message: '계정을 찾을 수 없습니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),
]
