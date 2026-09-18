import { http, HttpResponse } from 'msw'
import {
  companyAccounts,
  resetCompanyAccountPassword,
  updateCompanyAccountInfo,
} from '../data/accounts'
import {
  assignManager,
  approvePeriodRequest as mockApprovePeriodRequest,
  cancelAssignedCase,
  cancelPendingCase,
  securityCases,
} from '../data/securityCases'
import { workers } from '../data/workers'
import { ACTIVE_SECURITY_CASE_STATUSES } from '../../features/police/types/securityCase'
import { GUARD_CASE_STATUS_CODE } from '@/shared/lib/deployStatus'
import type { SecurityCase } from '../../features/police/types/securityCase'
import { computeCaseHistorySummary } from '../../features/police/lib/historySummary'
import { caseTypeToCrimeCode } from '../../shared/lib/crimeType'
import { joinMeasureItems, formatMeasurePeriod } from '../../shared/lib/caseMeasures'

// 5개 조치 — c.baseInfo(등록돼 있으면)를 summaryN/summaryNDate 문자열로 직렬화.
// mocks/handlers/history.ts와 동일 헬퍼(경찰/본사 GetHistoryDetail이 같은 shape).
function summariesOf(c: SecurityCase) {
  const b = c.baseInfo
  return {
    summary1: b ? joinMeasureItems(b.safetyMeasures) : null,
    summary1Date: b ? formatMeasurePeriod(b.safetyMeasuresPeriod) : null,
    summary2: b ? joinMeasureItems(b.emergencyMeasures) : null,
    summary2Date: b ? formatMeasurePeriod(b.emergencyMeasuresPeriod) : null,
    summary3: b ? joinMeasureItems(b.provisionalMeasures) : null,
    summary3Date: b ? formatMeasurePeriod(b.provisionalMeasuresPeriod) : null,
    summary4: b ? joinMeasureItems(b.emergencyTempMeasures) : null,
    summary4Date: b ? formatMeasurePeriod(b.emergencyTempMeasuresPeriod) : null,
    summary5: b ? joinMeasureItems(b.temporaryMeasures) : null,
    summary5Date: b ? formatMeasurePeriod(b.temporaryMeasuresPeriod) : null,
  }
}

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — [본사] 배치요청
// 목록·본부 배정·경호목록·연장단축·관리자 계정 관리는 실제 백엔드(GuardCase/Stec/W/
// GetDeployRequestList·AddGuardCase·GetGuardCaseList·GetExtend/ShortenRequestList·
// ConfirmCasePeriod, User/Stec/W/GetStecUserList·UpdateUser)로 연동 완료됐다
// (docs/backend-integration/responses/GuardCase-Stec-*.md, User-Stec-GetStecUserList.md).
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

// GetGuardCaseList의 regionSeq/groupSeq 필터를 vitest에서 재현하기 위한 자체
// id 매핑 — mocks/data/securityCases.ts의 JURISDICTION_BY_STATION과 짝을 맞춘
// 것으로, GetPoliceUserList 더블(mocks/data/policeAccountTree.ts, 계정관리 화면용)의
// id와는 별개다(두 화면 목적이 달라 굳이 하나로 합치지 않음 — 이 화면 테스트는
// 실백엔드로 별도 검증했다).
const STATION_GROUP_SEQ: Record<string, number> = {
  강남경찰서: 1001,
  서초경찰서: 1002,
  종로경찰서: 1003,
  분당경찰서: 1004,
  부산진경찰서: 1005,
}
const REGION_SEQ: Record<string, number> = {
  서울지방경찰청: 2001,
  경기남부지방경찰청: 2002,
  부산지방경찰청: 2003,
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
  // 실서버는 본부관리자 토큰에 403(배치요청 목록은 운영/시스템관리자 전용 —
  // RequestListPage 라우트도 COMPANY_ADMIN이라 in-app 진입은 애초에 불가).
  http.get('/api/v1/GuardCase/Stec/W/GetDeployRequestList', ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    if (stecUserFromBearer(request)?.role === '본부관리자') {
      return HttpResponse.json({ message: '권한이 없습니다.', data: null, code: 403 }, { status: 403 })
    }
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

  // 배치요구서 원본 상세 — GET GuardCase/Stec/W/GetDeployDetail?deployReqSeq=
  // (docs/backend-integration/responses/GuardCase-Stec-GetDeployDetail.md). 화면7
  // (배치요청 목록) 행 클릭 시 DispatchRequestViewDialog가 부른다(2026-09-11,
  // requests.ts::getDeployRequestDetail). 화면9(경호 상세)도 같은 EP를 쓰지만
  // 그쪽은 GetGuardCaseDetail의 mock 필드로 이미 채워져 있어 실제로는 호출 안 됨
  // (getSecurityCase의 detail.mock 분기).
  http.get('/api/v1/GuardCase/Stec/W/GetDeployDetail', ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const seq = new URL(request.url).searchParams.get('deployReqSeq')
    const record = securityCases.find((c) => deploySeqOf(c) === Number(seq))
    if (!record) {
      return HttpResponse.json(
        { message: '존재하지 않는 배치요구서입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    const data = {
      deployReqSeq: deploySeqOf(record),
      crimeType: record.caseType,
      suspectUserName: record.subject.nameInitial,
      suspectGender: record.subject.gender === '여' ? 1 : record.subject.gender === '남' ? 0 : null,
      suspectBirth: record.subject.birthDate || null,
      suspectJob: record.subject.occupation || null,
      suspectAddress: record.subject.residence || null,
      caseSummary: record.caseSummary || null,
      caseMemo: record.additionalNotes || null,
      periodFrom: record.startDate || null,
      periodTo: record.endDate || null,
      guardHomeLoc: record.location.residence || null,
      guardWorkLoc: record.location.workplace || null,
      etcLoc1: record.location.etc1 || null,
      etcLoc2: record.location.etc2 || null,
      documentDt: record.createdAt ? record.createdAt.slice(0, 10) : null,
      clientDept: record.requester.dept || null,
      clientPosition: record.requester.position || null,
      clientName: record.requester.name || null,
      investigator: record.policeContact.investigator || null,
      responsibleOfficer: record.policeContact.victimOfficer || null,
    }
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
    // 2026-09-18 필터/페이지네이션 파일럿(화면8) — mgmtNo/regionSeq/groupSeq/status
    // 서버 파라미터 재현(docs/architecture.md "상태관리").
    const mgmtNoParam = url.searchParams.get('mgmtNo')
    const regionSeqParam = url.searchParams.get('regionSeq')
    const groupSeqParam = url.searchParams.get('groupSeq')
    const statusParam = url.searchParams.get('status')

    const all = securityCases
      .filter((c) => ACTIVE_SECURITY_CASE_STATUSES.includes(c.status))
      .filter((c) => account.role !== '본부관리자' || c.assigneeId === account.id)
      .filter((c) => !mgmtNoParam || `${c.receiptNumber} ${c.securityCode}`.includes(mgmtNoParam))
      .filter((c) => !regionSeqParam || REGION_SEQ[c.jurisdiction] === Number(regionSeqParam))
      .filter((c) => !groupSeqParam || STATION_GROUP_SEQ[c.policeStation] === Number(groupSeqParam))
      .filter(
        (c) => !statusParam || (GUARD_CASE_STATUS_CODE[c.status] ?? null) === Number(statusParam),
      )
      .map((c) => ({
        caseSeq: caseSeqOf(c),
        mgmtNo: `${c.receiptNumber} ${c.securityCode}`,
        groupName: c.policeStation,
        parentGroupName: c.jurisdiction,
        userName: nameOfAssignee(c.assigneeId),
        userSeq: c.assigneeId ? userSeqOf(c.assigneeId) : null,
        statusName: c.status,
        guardCaseStatus: GUARD_CASE_STATUS_CODE[c.status] ?? null,
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
  // 2026-09-09 스웨거 회신: 세 권한 모두 조회 가능(내용 동일) — 본부관리자 403 재현 제거.
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

  // 취소(접수취소 / 경호취소) — POST GuardCase/Stec/W/CancelGuardCase { deployReqSeq, reason? }.
  // 서버가 배정 여부로 갈라 처리한다(findings #9, 2026-09-09 신설). 키는 deployReqSeq.
  // 없는 값 → 400. 본부관리자가 남의 배정 건 → 403 "담당하지 않는 경호건입니다",
  // 접수 건 → 403 "담당하지 않는 배치요구서입니다"(접수취소는 시스템·운영만).
  // 배정 전 = 접수취소(행 삭제, reason 무시), 배정 후 = 경호취소(상태 '취소', reason 필수).
  http.post('/api/v1/GuardCase/Stec/W/CancelGuardCase', async ({ request }) => {
    const denied = requireStec(request)
    if (denied) return denied
    const account = stecUserFromBearer(request)!
    const { deployReqSeq, reason } = (await request.json()) as {
      deployReqSeq?: unknown
      reason?: unknown
    }
    const record = securityCases.find((c) => deploySeqOf(c) === Number(deployReqSeq))
    if (deployReqSeq == null || !record) {
      return HttpResponse.json(
        { message: '잘못된 요청입니다.', data: false, code: 400 },
        { status: 400 },
      )
    }
    const pending = record.status === '접수'
    if (account.role === '본부관리자') {
      if (pending) {
        return HttpResponse.json(
          { message: '담당하지 않는 배치요구서입니다.', data: false, code: 403 },
          { status: 403 },
        )
      }
      if (record.assigneeId !== account.id) {
        return HttpResponse.json(
          { message: '담당하지 않는 경호건입니다.', data: false, code: 403 },
          { status: 403 },
        )
      }
    }
    if (record.status === '취소' || record.status === '종결') {
      return HttpResponse.json(
        { message: '취소할 수 없는 상태입니다.', data: false, code: 409 },
        { status: 409 },
      )
    }
    const ok = pending
      ? cancelPendingCase(record.id)
      : Boolean(cancelAssignedCase(record.id, typeof reason === 'string' ? reason : ''))
    if (!ok) {
      return HttpResponse.json(
        { message: '취소할 수 없는 상태입니다.', data: false, code: 409 },
        { status: 409 },
      )
    }
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),

  // 이력 조회 목록 — GET History/Stec/W/GetHistoryList.
  // 끝난 건(종결·취소)만. 응답은 GetGuardCaseList처럼 {meta, data:[...]}를 envelope로
  // 한 번 더 감싼다. 운영/시스템관리자는 전국 전체, 본부관리자는 본인 배정 건만
  // (HIST-003 — 실서버에서 StecM3(배정 0건) → 이력 0건 실측).
  http.get('/api/v1/History/Stec/W/GetHistoryList', ({ request }) => {
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
    // 2026-09-18 필터/페이지네이션 배치 적용(화면13) — searchKey/status/startDate/
    // endDate/regionSeq/groupSeq 서버 파라미터 재현. regionSeq/groupSeq id 매핑은
    // 위 GetGuardCaseList 핸들러와 같은 STATION_GROUP_SEQ/REGION_SEQ 표를 공유한다.
    const searchKeyParam = url.searchParams.get('searchKey')
    const statusParam = url.searchParams.get('status')
    const startDateParam = url.searchParams.get('startDate')
    const endDateParam = url.searchParams.get('endDate')
    const regionSeqParam = url.searchParams.get('regionSeq')
    const groupSeqParam = url.searchParams.get('groupSeq')

    const all = securityCases
      .filter((c) => c.status === '종결' || c.status === '취소')
      .filter((c) => account.role !== '본부관리자' || c.assigneeId === account.id)
      .filter((c) => !searchKeyParam || `${c.receiptNumber} ${c.securityCode}`.includes(searchKeyParam))
      .filter(
        (c) => !statusParam || (GUARD_CASE_STATUS_CODE[c.status] ?? null) === Number(statusParam),
      )
      .filter((c) => !startDateParam || (c.startDate && c.startDate >= startDateParam))
      .filter((c) => !endDateParam || (c.startDate && c.startDate <= endDateParam))
      .filter((c) => !regionSeqParam || REGION_SEQ[c.jurisdiction] === Number(regionSeqParam))
      .filter((c) => !groupSeqParam || STATION_GROUP_SEQ[c.policeStation] === Number(groupSeqParam))
      .map((c) => {
        const canceled = c.status === '취소'
        return {
          caseSeq: caseSeqOf(c),
          mgmtNo: `${c.receiptNumber} ${c.securityCode}`,
          groupName: c.policeStation,
          parentGroupName: c.jurisdiction,
          // 실서버는 취소 건의 경호기간·총근무시간을 null로 준다.
          startDt: canceled ? null : c.startDate,
          endDt: canceled ? null : c.endDate,
          totalMin: canceled
            ? null
            : Math.round(computeCaseHistorySummary(c.workSchedule).totalHours * 60),
          statusName: canceled ? '경호취소' : '종결',
          remark: canceled ? (c.cancelReason ?? null) : (c.closureReason ?? null),
        }
      })

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

  // 이력 상세 — GET History/Stec/W/GetHistoryDetail?caseSeq= (2026-09-09 신설).
  // 경찰용(History/Police/W/GetHistoryDetail) 응답 + groupName·parentGroupName. 상태를
  // 가리지 않으나 화면은 종결·취소 건만 이 경로로 온다. 본부관리자는 본인 배정 건만
  // (범위 밖이면 404 — 없는 건과 동일).
  http.get('/api/v1/History/Stec/W/GetHistoryDetail', ({ request }) => {
    const account = stecUserFromBearer(request)
    if (!account) {
      return HttpResponse.json(
        { message: '인증이 필요합니다.', data: null, code: 401 },
        { status: 401 },
      )
    }
    const seq = new URL(request.url).searchParams.get('caseSeq') ?? ''
    const c =
      securityCases.find((x) => x.id === seq) ??
      securityCases.find((x) => String(caseSeqOf(x)) === seq)
    if (!c || (account.role === '본부관리자' && c.assigneeId !== account.id)) {
      return HttpResponse.json(
        { message: '존재하지 않는 경호건입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    const canceled = c.status === '취소'
    return HttpResponse.json({
      message: 'ok',
      data: {
        caseSeq: caseSeqOf(c),
        mgmtNo: `${c.receiptNumber} ${c.securityCode ?? '접수'}`,
        statusName: canceled ? '경호취소' : c.status,
        groupName: c.policeStation,
        parentGroupName: c.jurisdiction,
        crimeType: caseTypeToCrimeCode(c.caseType),
        suspectUserName: c.subject.nameInitial,
        startDate: canceled ? null : c.startDate,
        endDate: canceled ? null : c.endDate,
        totalGuardWorkMinutes:
          c.status === '종결'
            ? Math.round(computeCaseHistorySummary(c.workSchedule).totalHours * 60)
            : null,
        investigator: c.policeContact.investigator || null,
        responsibleOfficer: c.policeContact.victimOfficer || null,
        ...summariesOf(c),
        endDt: (canceled ? c.canceledAt : c.closedAt) ?? null,
        remark: (canceled ? c.cancelReason : c.closureReason) ?? null,
        guards: computeCaseHistorySummary(c.workSchedule).workers.map((w) => ({
          guardSeq: Number(w.workerId.replace(/\D/g, '')) || 0,
          guardName: workers.find((worker) => worker.id === w.workerId)?.name ?? w.workerId,
          workDays: w.workedDays,
          totalMinutes: Math.round(w.totalHours * 60),
        })),
      },
      code: 200,
    })
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
