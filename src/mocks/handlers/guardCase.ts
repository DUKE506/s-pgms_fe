import { http, HttpResponse } from 'msw'
import { companyAccounts } from '../data/accounts'
import { assignManager, securityCases } from '../data/securityCases'
import { ACTIVE_SECURITY_CASE_STATUSES } from '../../features/police/types/securityCase'
import type { SecurityCase } from '../../features/police/types/securityCase'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — [본사] 배치요청
// 목록·본부 배정·경호목록은 실제 백엔드(GuardCase/Stec/W/GetDeployRequestList·
// AddGuardCase·GetGuardCaseList, User/Stec/W/GetStecUserList)로 연동 완료됐다
// (docs/backend-integration-responses/GuardCase-Stec-*.md, User-Stec-GetStecUserList.md).
// 브라우저 dev에서는 이 경로들을 MSW 미등록으로 두고 vite 프록시가 실제 백엔드로
// 보낸다. 여기서는 실제 응답 envelope({message,data,code})와 항목 필드를 흉내내
// vitest가 매핑 로직까지 오프라인으로 검증하게 한다. 스코프(운영/시스템관리자
// 전국·본부관리자 403 또는 본인 건만)는 대체로 실제 백엔드 몫이지만, 경호목록의
// 본부관리자 "본인 건만"은 프론트 회귀 테스트가 있어 이 더블에서도 재현한다.

function stecUserFromBearer(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  return companyAccounts.find((a) => a.id === accountId)
}

function requireStec(request: Request) {
  return stecUserFromBearer(request)
    ? null
    : HttpResponse.json({ message: '인증이 필요합니다.', data: null, code: 401 }, { status: 401 })
}

// mock SecurityCase.id('case-seed-1') → 실제 백엔드의 deploySeq(정수) 자리.
function deploySeqOf(c: SecurityCase) {
  return Number(c.id.replace(/\D/g, '')) || 0
}

// companyAccounts.id('hqmanager1') → 실제 백엔드의 userSeq(정수) 자리.
function userSeqOf(accountId: string) {
  return Number(accountId.replace(/\D/g, '')) || 0
}

// mock SecurityCase.id('case-seed-6') → 실제 백엔드의 caseSeq(정수) 자리.
function caseSeqOf(c: SecurityCase) {
  return Number(c.id.replace(/\D/g, '')) || 0
}

function nameOfAssignee(assigneeId: string | undefined) {
  return companyAccounts.find((a) => a.id === assigneeId)?.name ?? ''
}

function codeSeqOf(role: string) {
  return role === '시스템관리자' ? 1 : role === '운영관리자' ? 2 : 3
}

export const guardCaseTestHandlers = [
  // 목록 조회 — GET GuardCase/Stec/W/GetDeployRequestList.
  // 미배정(접수 상태) 배치요구서만. 실제 응답은 파라미터 없이 전량 반환.
  http.get('/api/v1/GuardCase/Stec/W/GetDeployRequestList', ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const data = securityCases
      .filter((c) => c.status === '접수')
      .map((c) => ({
        deploySeq: deploySeqOf(c),
        caseSeq: null,
        mgmtNo: c.receiptNumber,
        groupName: c.policeStation,
        parentGroupName: c.jurisdiction,
        createDt: c.createdAt.slice(0, 10),
        periodFrom: c.startDate,
        periodTo: c.endDate,
        requestedEndDate: null,
      }))
    return HttpResponse.json({ message: 'ok', data, code: 200 })
  }),

  // 경호목록 조회 — GET GuardCase/Stec/W/GetGuardCaseList.
  // 진행 중 건(배정·경호중·경호완료)만. 응답은 {meta, data:[...]}를 envelope로 한 번
  // 더 감싼 형태. 운영/시스템관리자는 전체, 본부관리자는 본인 배정 건만(WORK-009).
  http.get('/api/v1/GuardCase/Stec/W/GetGuardCaseList', ({ request }) => {
    const account = stecUserFromBearer(request)
    if (!account) {
      return HttpResponse.json(
        { message: '인증이 필요합니다.', data: null, code: 401 },
        { status: 401 },
      )
    }
    const url = new URL(request.url)
    const pageNumber = Number(url.searchParams.get('pageNumber') ?? '1')
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10')
    // 실제 백엔드 제약: pageNumber >= 1, pageSize 1~100.
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageSize < 1 || pageSize > 100) {
      return HttpResponse.json(
        {
          message: '페이지 번호는 1 이상, 페이지 크기는 1~100이어야 합니다.',
          data: null,
          code: 400,
        },
        { status: 400 },
      )
    }

    const all = securityCases
      .filter((c) => ACTIVE_SECURITY_CASE_STATUSES.includes(c.status))
      .filter((c) => account.role !== '본부관리자' || c.assigneeId === account.id)
      .map((c) => ({
        caseSeq: caseSeqOf(c),
        mgmtNo: `${c.receiptNumber} ${c.securityCode}`,
        groupName: c.policeStation,
        userName: nameOfAssignee(c.assigneeId),
        statusName: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
      }))

    const start = (pageNumber - 1) * pageSize
    return HttpResponse.json({
      message: 'ok',
      data: {
        meta: {
          pageNumber,
          pageSize,
          totalCount: all.length,
          totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
        },
        data: all.slice(start, start + pageSize),
      },
      code: 200,
    })
  }),

  // 담당자 선택 목록 — GET User/Stec/W/GetStecUserList.
  // 전용 엔드포인트가 없어 본사 사용자 전체를 반환, 프론트가 본부관리자만 필터한다.
  http.get('/api/v1/User/Stec/W/GetStecUserList', ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const data = companyAccounts.map((a) => ({
      userSeq: userSeqOf(a.id),
      codeSeq: codeSeqOf(a.role),
      codeName: a.role,
      groupSeq: null,
      groupName: null,
      loginId: a.id,
      userName: a.name,
      phone: a.phone ?? null,
      useYn: true,
      pwChangedYn: !a.mustChangePassword,
    }))
    return HttpResponse.json({ message: 'ok', data, code: 200 })
  }),

  // 본부 배정 — POST GuardCase/Stec/W/AddGuardCase {deploySeq, userSeq}.
  // 실제 백엔드는 여기서 GuardCase를 생성하고 data:true만 돌려준다. 더블은 mock
  // assignManager(접수 → 배정 + 경호코드 발급)로 같은 인메모리 배열을 갱신한다.
  http.post('/api/v1/GuardCase/Stec/W/AddGuardCase', async ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const { deploySeq, userSeq } = (await request.json()) as {
      deploySeq: unknown
      userSeq: unknown
    }
    const record = securityCases.find((c) => deploySeqOf(c) === Number(deploySeq))
    const manager = companyAccounts.find(
      (a) => a.role === '본부관리자' && userSeqOf(a.id) === Number(userSeq),
    )
    if (!record || !manager) {
      return HttpResponse.json(
        { message: '잘못된 요청입니다.', data: false, code: 400 },
        { status: 400 },
      )
    }
    const updated = assignManager(record.id, manager.id)
    if (!updated) {
      return HttpResponse.json(
        { message: '배정할 수 없는 상태입니다.', data: false, code: 400 },
        { status: 400 },
      )
    }
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),
]
