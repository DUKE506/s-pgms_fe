import { http, HttpResponse } from 'msw'
import { changeCompanyAccountPassword, companyAccounts, type Account } from '../data/accounts'
import { allPoliceLoginAccounts, changeGuestAccountPassword } from '../data/guests'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — 로그인
// 화면은 이미 실제 백엔드(/api/v1/Login/W/*)로 연동 완료됐다(docs/
// backend-integration-responses/Login-*.md). 브라우저 dev 모드에서는 이
// 경로가 MSW 미등록 상태로 남아 vite 프록시를 통해 실제 백엔드로 나가야
// 하므로, 여기서 핸들러를 등록하면 안 된다. 실제 응답 envelope 구조
// ({message,data,code})와 상태코드(성공 200 / 자격증명 오류 400 / 최초
// 로그인 428)를 최대한 그대로 흉내내 vitest가 오프라인으로 돌아가게 한다.

// 실제 BASIC_CODE 매핑(Login-GetMyProfile.md 실측) — 프론트 Role → codeSeq
// 역방향. 테스트 픽스처 전용이라 features/auth/lib/roleMapping.ts의 정방향
// 매핑과 별개로 둔다(그쪽이 바뀌어도 이 테스트 더블이 실제 응답 모양을
// 계속 정확히 흉내내는지는 각자 검증해야 함).
const CODE_SEQ_BY_ROLE: Record<Account['role'], number> = {
  시스템관리자: 1,
  운영관리자: 2,
  본부관리자: 3,
  본청: 4,
  지역청: 5,
  경찰서: 6,
  게스트: 7,
}

function envelope<T>(data: T, code = 200) {
  return HttpResponse.json({ message: 'ok', data, code })
}

function issueTokens(id: string) {
  const nonce = Math.random().toString(36).slice(2, 8)
  return { accessToken: `access.${id}.${nonce}`, refreshToken: `refresh.${id}.${nonce}` }
}

function parseAccountId(token: string) {
  return token.split('.')[1]
}

function allAccounts(): Account[] {
  return [...allPoliceLoginAccounts(), ...companyAccounts]
}

function findByBearer(request: Request): Account | undefined {
  const header = request.headers.get('authorization') ?? ''
  const token = header.replace(/^Bearer /, '')
  const id = parseAccountId(token)
  return allAccounts().find((a) => a.id === id)
}

export const authHandlers = [
  http.post('/api/v1/Login/W/Login', async ({ request }) => {
    const { loginId, loginPw } = (await request.json()) as { loginId: string; loginPw: string }
    // 아이디 대소문자 무관 매칭 — 게스트 발급 아이디 표시값과 저장값 대소문자가
    // 다른 것과 같은 이유(mocks/handlers/auth.ts 기존 구현 참고).
    const account = allAccounts().find(
      (a) => a.id.toLowerCase() === loginId.toLowerCase() && a.password === loginPw,
    )

    if (!account) {
      return HttpResponse.json(
        { message: '아이디 또는 비밀번호가 올바르지 않습니다.', data: null, code: 400 },
        { status: 400 },
      )
    }
    if (account.mustChangePassword) {
      return HttpResponse.json(
        { message: '비밀번호 변경이 필요합니다.', data: null, code: 428 },
        { status: 428 },
      )
    }

    return envelope(issueTokens(account.id))
  }),

  http.get('/api/v1/Login/W/GetMyProfile', ({ request }) => {
    const account = findByBearer(request)
    if (!account) {
      return HttpResponse.json(
        { success: false, errorCode: 'session_expired', message: 'Session has been terminated.' },
        { status: 401 },
      )
    }

    return envelope({
      userSeq: 0,
      userName: account.name,
      codeSeq: CODE_SEQ_BY_ROLE[account.role],
      codeName: account.role,
      groupSeq: null,
      groupName: null,
    })
  }),

  http.post('/api/v1/Login/W/ChangePassword', async ({ request }) => {
    const { loginId, loginPw } = (await request.json()) as { loginId: string; loginPw: string }
    const account = allAccounts().find((a) => a.id.toLowerCase() === loginId.toLowerCase())
    if (!account || !account.mustChangePassword) {
      return HttpResponse.json({ message: '잘못된 요청입니다.', data: false, code: 400 }, { status: 400 })
    }

    if (account.role === '게스트') {
      changeGuestAccountPassword(account.id, loginPw)
    } else {
      changeCompanyAccountPassword(account.id, loginPw)
    }
    return envelope(true)
  }),

  http.post('/api/v1/Login/W/RefreshToken', async ({ request }) => {
    const { refreshToken } = (await request.json()) as { accessToken: string; refreshToken: string }
    const account = allAccounts().find((a) => a.id === parseAccountId(refreshToken))

    if (!account) {
      return HttpResponse.json(
        { success: false, errorCode: 'session_expired', message: 'Session has been terminated.' },
        { status: 401 },
      )
    }

    return envelope(issueTokens(account.id))
  }),

  http.post('/api/v1/Login/W/Logout', () => envelope(true)),
]
