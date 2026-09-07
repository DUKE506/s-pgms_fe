import { http, HttpResponse } from 'msw'
import {
  companyAccounts,
  resetCompanyAccountPassword,
  updateCompanyAccountInfo,
} from '../data/accounts'
import {
  assignManager,
  approvePeriodRequest as mockApprovePeriodRequest,
  securityCases,
} from '../data/securityCases'
import { ACTIVE_SECURITY_CASE_STATUSES } from '../../features/police/types/securityCase'
import type { SecurityCase } from '../../features/police/types/securityCase'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — [본사] 배치요청
// 목록·본부 배정·경호목록·연장단축·관리자 계정 관리는 실제 백엔드(GuardCase/Stec/W/
// GetDeployRequestList·AddGuardCase·GetGuardCaseList·GetExtend/ShortenRequestList·
// ConfirmCasePeriod, User/Stec/W/GetStecUserList·UpdateUser)로 연동 완료됐다
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

// companyAccounts.id('hqmanager1') → 실제 백엔드의 userSeq(정수) 자리. 숫자가 없는
// 관리자 계정(sysadmin/opadmin)은 서로 0으로 겹치므로 고정값을 준다.
const FIXED_USER_SEQ: Record<string, number> = { sysadmin: 901, opadmin: 902 }
function userSeqOf(accountId: string) {
  return FIXED_USER_SEQ[accountId] ?? (Number(accountId.replace(/\D/g, '')) || 0)
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

// GET GetExtendRequestList / GetShortenRequestList 공용. pendingPeriodRequest.type이
// 일치하는 진행 중 건을 GetDeployRequestList와 같은 항목 형태로 반환한다. 본부관리자는
// 본인 배정 건만(WORK-009 재현).
function periodRequestList(request: Request, type: '연장' | '단축') {
  const account = stecUserFromBearer(request)
  if (!account) {
    return HttpResponse.json(
      { message: '인증이 필요합니다.', data: null, code: 401 },
      { status: 401 },
    )
  }
  const data = securityCases
    .filter((c) => c.pendingPeriodRequest?.type === type)
    .filter((c) => account.role !== '본부관리자' || c.assigneeId === account.id)
    .map((c) => ({
      deploySeq: deploySeqOf(c),
      caseSeq: caseSeqOf(c),
      mgmtNo: c.receiptNumber,
      groupName: c.policeStation,
      parentGroupName: c.jurisdiction,
      createDt: c.createdAt.slice(0, 10),
      periodFrom: c.startDate,
      periodTo: c.endDate,
      requestedEndDate: c.pendingPeriodRequest!.requestedEndDate,
    }))
  return HttpResponse.json({ message: 'ok', data, code: 200 })
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

  // 담당자 선택 목록 / 관리자 계정 관리 목록 — GET User/Stec/W/GetStecUserList.
  // 전용 엔드포인트가 없어 본사 사용자 전체를 반환, 프론트가 본부관리자만 필터한다.
  // 실서버는 본부관리자 토큰에 403(운영/시스템관리자 전용) — 그대로 재현한다.
  http.get('/api/v1/User/Stec/W/GetStecUserList', ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const actor = stecUserFromBearer(request)
    if (actor?.role === '본부관리자') {
      return HttpResponse.json({ message: '권한이 없습니다.', data: null, code: 403 }, { status: 403 })
    }
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

  // 정보수정 / 비밀번호 초기화 — PATCH User/Stec/W/UpdateUser.
  // 실제 백엔드는 userSeq로 대상을 찾아 넘어온 필드만 부분 갱신한다. 더블은
  // companyAccounts(인메모리)를 갱신해 뒤이은 GetStecUserList가 반영하게 한다.
  // name이 오면 정보수정(name+phone), loginPw가 오면 비번초기화로 갈라 처리한다.
  http.patch('/api/v1/User/Stec/W/UpdateUser', async ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const body = (await request.json()) as {
      userSeq: number
      name?: string
      phone?: string | null
      loginPw?: string
      pwChangedYn?: boolean
    }
    const account = companyAccounts.find((a) => userSeqOf(a.id) === Number(body.userSeq))
    if (!account) {
      return HttpResponse.json(
        { message: '계정을 찾을 수 없습니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    if (body.name !== undefined) {
      updateCompanyAccountInfo(account.id, {
        name: body.name,
        phone: body.phone ?? undefined,
      })
    }
    if (body.loginPw !== undefined) {
      resetCompanyAccountPassword(account.id)
    }
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
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

  // 연장/단축 요청 목록 — GET GuardCase/Stec/W/GetExtendRequestList · GetShortenRequestList.
  http.get('/api/v1/GuardCase/Stec/W/GetExtendRequestList', ({ request }) =>
    periodRequestList(request, '연장'),
  ),
  http.get('/api/v1/GuardCase/Stec/W/GetShortenRequestList', ({ request }) =>
    periodRequestList(request, '단축'),
  ),

  // 연장/단축 승인 — POST GuardCase/Stec/W/ConfirmCasePeriod {caseSeq}.
  // 실제 백엔드는 배치요구서 상태로 연장/단축을 판단해 기간·스케줄에 반영하고
  // {data:true}만 준다. 더블은 mock approvePeriodRequest(연장=일자 추가 / 단축=일자
  // 잘라내기)로 갱신하고, 본부관리자는 본인 배정 건만 승인 가능하도록 스코프를 재현한다.
  http.post('/api/v1/GuardCase/Stec/W/ConfirmCasePeriod', async ({ request }) => {
    const account = stecUserFromBearer(request)
    if (!account) {
      return HttpResponse.json(
        { message: '인증이 필요합니다.', data: null, code: 401 },
        { status: 401 },
      )
    }
    const { caseSeq } = (await request.json()) as { caseSeq: unknown }
    const record = securityCases.find((c) => caseSeqOf(c) === Number(caseSeq))
    if (!record || !record.pendingPeriodRequest) {
      return HttpResponse.json(
        { message: '대기 중인 요청이 없습니다.', data: false, code: 400 },
        { status: 400 },
      )
    }
    if (account.role === '본부관리자' && record.assigneeId !== account.id) {
      return HttpResponse.json(
        { message: '권한이 없습니다.', data: false, code: 403 },
        { status: 403 },
      )
    }
    const updated = mockApprovePeriodRequest(record.id)
    if (!updated) {
      return HttpResponse.json(
        { message: '승인할 수 없는 상태입니다.', data: false, code: 400 },
        { status: 400 },
      )
    }
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),
]
