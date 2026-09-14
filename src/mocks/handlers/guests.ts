import { http, HttpResponse } from 'msw'
import { policeAccounts } from '../data/accounts'
import {
  createGuestAccount,
  deleteGuestAccount,
  guestAccounts,
  pruneTerminalCaseAssignments,
  updateGuestAccount,
} from '../data/guests'
import { securityCases } from '../data/securityCases'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — [경찰서] 게스트 계정
// 관리는 실제 백엔드(User/Police/W/GetGuestUserList·GetGuestCaseList·GetGuestCaseDetail·
// AddGuestUser·UpdateGuestCaseInfo·DeleteGuestUser)로 연동 완료됐다(응답 샘플:
// docs/backend-integration/responses/User-Police-Guest.md). 브라우저 dev에서는 이 경로를
// MSW 미등록으로 두고 vite 프록시가 실제 백엔드로 보낸다. 여기서는 실제 응답 envelope·
// 항목 필드를 흉내내 vitest가 매핑 로직을 오프라인으로 검증하게 한다. groupSeq 필터는
// 실제 백엔드 몫이라 Bearer 토큰으로 소속 경찰서를 판별한다.

function stationFromBearer(request: Request) {
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  const account = policeAccounts.find((a) => a.id === accountId)
  return account && account.role === '경찰서' ? account : undefined
}

// mock securityCases의 문자열 id(case-seed-6 등)에서 정수 caseSeq를 뽑는다 —
// 실 응답의 caseSeq가 정수라 다이얼로그도 정수로 다룬다(history.ts 더블과 동일 규칙).
function caseSeqOf(c: { id: string }) {
  return Number(c.id.replace(/\D/g, '')) || 0
}
function caseIdFromSeq(seq: number): string | undefined {
  return securityCases.find((c) => caseSeqOf(c) === seq)?.id
}

function candidatesForStation(stationName: string) {
  return securityCases.filter(
    (c) =>
      c.policeStation === stationName &&
      Boolean(c.securityCode) &&
      c.status !== '종결' &&
      c.status !== '취소',
  )
}

const ok = (data: unknown) =>
  HttpResponse.json({ message: '요청이 정상 처리되었습니다.', data, code: 200 })
const unauthorized = () =>
  HttpResponse.json({ message: '인증이 필요합니다.', data: null, code: 401 }, { status: 401 })
const forbidden = () =>
  HttpResponse.json(
    { message: '소속 경찰서의 게스트 계정이 아닙니다.', data: false, code: 403 },
    { status: 403 },
  )

export const guestTestHandlers = [
  // 게스트 계정 평면 목록 — accessList에 조회권 부여된 건의 {caseSeq,guardCode}.
  http.get('/api/v1/User/Police/W/GetGuestUserList', ({ request }) => {
    const account = stationFromBearer(request)
    if (!account) return unauthorized()
    // 종결/취소된 건에 남아있던 조회권을 조회 시점에 자가 치유(2026-08-27 사용자 확인).
    pruneTerminalCaseAssignments(securityCases)
    const rows = guestAccounts
      .filter((g) => g.policeStation === account.name)
      .map((g) => ({
        userSeq: g.userSeq,
        // 실 API의 loginId(자동 생성 "SPoliceGuest3")에 대응 — 더블에선 표시용 이름.
        // g.id(소문자)는 mock 로그인 계정 조회 전용 내부 키다.
        loginId: g.name,
        userName: g.name,
        useYn: true,
        createDt: g.issuedAt,
        memo: g.memo ?? null,
        accessList: g.caseIds
          .map((cid) => securityCases.find((c) => c.id === cid))
          .filter((c): c is (typeof securityCases)[number] => Boolean(c))
          .map((c) => ({ caseSeq: caseSeqOf(c), guardCode: c.securityCode })),
      }))
    return ok(rows)
  }),

  // 발급 후보 — isAccess 없음. 소속 경찰서의 경호코드 발급된 비종결/비취소 건.
  http.get('/api/v1/User/Police/W/GetGuestCaseList', ({ request }) => {
    const account = stationFromBearer(request)
    if (!account) return unauthorized()
    const rows = candidatesForStation(account.name).map((c) => ({
      caseSeq: caseSeqOf(c),
      groupSeq: 0,
      groupName: c.policeStation,
      mgmtNo: c.receiptNumber,
      guardCode: c.securityCode,
      status: 1,
      statusName: c.status,
    }))
    return ok(rows)
  }),

  // 수정 후보 — 같은 후보에 isAccess(현재 부여 여부)가 붙는다.
  http.get('/api/v1/User/Police/W/GetGuestCaseDetail', ({ request }) => {
    const account = stationFromBearer(request)
    if (!account) return unauthorized()
    const userSeq = Number(new URL(request.url).searchParams.get('userSeq'))
    const guest = guestAccounts.find((g) => g.userSeq === userSeq)
    if (!guest || guest.policeStation !== account.name) return forbidden()
    const accessList = candidatesForStation(account.name).map((c) => ({
      caseSeq: caseSeqOf(c),
      guardCode: c.securityCode,
      isAccess: guest.caseIds.includes(c.id),
    }))
    return ok({ userSeq, accessList })
  }),

  http.post('/api/v1/User/Police/W/AddGuestUser', async ({ request }) => {
    const account = stationFromBearer(request)
    if (!account) return unauthorized()
    const body = (await request.json()) as {
      name?: string
      caseSeqs?: number[]
      memo?: string | null
    }
    const caseIds = (body.caseSeqs ?? [])
      .map((seq) => caseIdFromSeq(seq))
      .filter((id): id is string => Boolean(id))
    // 아이디(loginId)는 서버가 자동 생성 — 더블도 기존 규칙(StationGuestN)을 유지하고
    // 넘어온 name(표시명)은 실 API처럼 받되 loginId에는 쓰지 않는다.
    createGuestAccount(account.name, caseIds, body.memo)
    return ok(true)
  }),

  http.patch('/api/v1/User/Police/W/UpdateGuestCaseInfo', async ({ request }) => {
    const account = stationFromBearer(request)
    if (!account) return unauthorized()
    const body = (await request.json()) as {
      userSeq: number
      accessList?: { caseSeq: number; isAccess: boolean }[]
      memo?: string | null
    }
    const guest = guestAccounts.find((g) => g.userSeq === body.userSeq)
    if (!guest || guest.policeStation !== account.name) return forbidden()
    const caseIds = (body.accessList ?? [])
      .filter((a) => a.isAccess)
      .map((a) => caseIdFromSeq(a.caseSeq))
      .filter((id): id is string => Boolean(id))
    updateGuestAccount(guest.id, caseIds, body.memo)
    return ok(true)
  }),

  http.post('/api/v1/User/Police/W/DeleteGuestUser', async ({ request }) => {
    const account = stationFromBearer(request)
    if (!account) return unauthorized()
    const body = (await request.json()) as { userSeq: number }
    const guest = guestAccounts.find((g) => g.userSeq === body.userSeq)
    if (!guest || guest.policeStation !== account.name) return forbidden()
    deleteGuestAccount(guest.id)
    return ok(true)
  }),
]
