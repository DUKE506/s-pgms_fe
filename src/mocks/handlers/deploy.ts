import { http, HttpResponse } from 'msw'
import { allPoliceLoginAccounts } from '../data/guests'
import {
  cancelAssignedCase,
  cancelPendingCase,
  closeCase,
  createSecurityCase,
  requestPeriodChange,
  securityCases,
  updateSecurityCase,
} from '../data/securityCases'
import type { ClosureReason, SecurityCase } from '../../features/police/types/securityCase'
import { caseTypeToCrimeCode, crimeCodeToCaseType } from '../../shared/lib/crimeType'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록, browser.ts엔 없음) — 경찰서 경호목록은
// 이미 실제 백엔드(GET /api/v1/Deploy/Police/W/GetDeployList)로 연동 완료됐다
// (docs/backend-integration/responses/Deploy-Police-GetDeployList.md). 브라우저
// dev에서는 이 경로를 MSW 미등록으로 두고 vite 프록시가 실제 백엔드로 보낸다.
// 여기서는 실제 응답 envelope({message,data,code})와 항목 필드(deploySeq/caseSeq/
// mgmtNo/suspectUserName/statusName/startDt/endDt/...)를 흉내내 vitest가 매핑
// 로직까지 오프라인으로 검증하게 한다. groupSeq 필수·403 스코프는 실제 백엔드가
// 강제하는 부분이라 이 더블에서는 재현하지 않고 Bearer 토큰으로 소속을 판별한다.

function stationFromBearer(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  return allPoliceLoginAccounts().find((a) => a.id === accountId)
}

// 실제 백엔드는 관리번호를 조합해서 내려준다 — 접수 단계는 경호코드 자리에 "접수"를
// 넣고("26-08-동래경찰서 접수"), 배정 이후엔 경호코드가 들어간다고 가정.
function mgmtNo(receiptNumber: string, securityCode?: string) {
  return `${receiptNumber} ${securityCode ?? '접수'}`
}

function deploySeqOf(c: SecurityCase) {
  return Number(c.id.replace(/\D/g, '')) || 0
}

// 실제 백엔드의 deployReqSeq(정수) 또는 vitest가 그대로 넘기는 mock 문자열 id
// (예: 'case-seed-1') 둘 다로 레코드를 찾는다.
function findBySeq(seq: unknown): SecurityCase | undefined {
  const s = String(seq)
  return (
    securityCases.find((c) => c.id === s) ??
    securityCases.find((c) => String(deploySeqOf(c)) === s)
  )
}

// AddDeployRequestDto / UpdateDeployRequestDto(서버 구조) → SecurityCaseCreateInput
// (mock createSecurityCase/updateSecurityCase가 받는 폼 구조). 배치장소는 4필드
// (guardHomeLoc/guardWorkLoc/guardEtcLoc1/guardEtcLoc2).
function dtoToCreateInput(dto: Record<string, unknown>) {
  return {
    subject: {
      nameInitial: String(dto.suspectName ?? ''),
      gender: dto.suspectGender === 1 ? '여' : '남',
      birthDate: String(dto.suspectBirthDate ?? ''),
      occupation: String(dto.suspectJob ?? ''),
      residence: String(dto.suspectAddress ?? ''),
    },
    caseType: crimeCodeToCaseType(dto.crimeType as string | null),
    caseSummary: String(dto.caseSummary ?? ''),
    startDate: String(dto.deploymentPeriodFrom ?? ''),
    endDate: String(dto.deploymentPeriodTo ?? ''),
    location: {
      residence: String(dto.guardHomeLoc ?? ''),
      workplace: String(dto.guardWorkLoc ?? ''),
      etc1: String(dto.guardEtcLoc1 ?? ''),
      etc2: String(dto.guardEtcLoc2 ?? ''),
    },
    additionalNotes: String(dto.caseMemo ?? ''),
    policeContact: {
      victimOfficer: String(dto.responsibleOfficer ?? ''),
      investigator: String(dto.investigator ?? ''),
    },
    requester: {
      dept: String(dto.clientDept ?? ''),
      position: String(dto.clientPosition ?? ''),
      name: String(dto.clientName ?? ''),
    },
  }
}

// mock SecurityCase 레코드 → GetDeployDetail 응답 data 형태.
// 접수 단계에서 실제로 내려오는 flat 필드만 실측대로 채우고, 배정 이후 상태
// (baseInfo/schedule/attachments 등) 화면 회귀를 오프라인으로 검증하기 위해
// mock 레코드 전체를 `mock`에 실어 보낸다 — 실제 GetDeployDetail 응답엔 `mock`
// 필드가 없다(getSecurityCase가 이걸 인지하고 처리). matrix 12번에서 정리.
function toDeployDetail(c: SecurityCase) {
  return {
    deployReqSeq: deploySeqOf(c),
    mgmtNo: mgmtNo(c.receiptNumber, c.securityCode),
    statusName: c.status,
    suspectUserName: c.subject.nameInitial,
    // 근무일자·근무시간은 경호계획 등록 후에만(2026-09-07 백엔드가 startDt/endDt →
    // startDate/endDate/startTime/endTime로 변경, 본사 GetGuardCaseDetail과 동일 구조).
    // 배정 이후 화면 회귀는 아래 mock 레코드 전체(mock: c)로 검증하므로 여기선 null.
    startDate: null,
    endDate: null,
    startTime: null,
    endTime: null,
    periodFrom: c.startDate,
    periodTo: c.endDate,
    requestedEndDate: c.pendingPeriodRequest?.requestedEndDate ?? null,
    clientName: c.requester.name,
    clientDept: c.requester.dept,
    clientPosition: c.requester.position,
    suspectAddress: c.subject.residence,
    guardHomeLoc: c.location.residence || null,
    guardWorkLoc: c.location.workplace || null,
    guardEtcLoc1: c.location.etc1 || null,
    guardEtcLoc2: c.location.etc2 || null,
    investigator: c.policeContact.investigator,
    responsibleOfficer: c.policeContact.victimOfficer,
    crimeType: caseTypeToCrimeCode(c.caseType),
    extendCount: 0,
    downloadYn: null,
    // 조치 5개·대표근무자는 경호계획 등록 후에만 실제 값이 붙는다(2026-09-07 실측).
    // 배정 이후 화면 회귀는 아래 mock 레코드 전체로 검증하므로 여기선 null/빈 값.
    summary1: null,
    summary1Date: null,
    summary2: null,
    summary2Date: null,
    summary3: null,
    summary3Date: null,
    summary4: null,
    summary4Date: null,
    summary5: null,
    summary5Date: null,
    guardUserList: [],
    docGuardDetail: null,
    docDestructionDetail: null,
    docAgreeDetail: [],
    mock: c,
  }
}

// mock SecurityCase → GetDeployDetailUpdate 응답 data 형태(화면5 배치요구서 수정
// prefill). GetDeployDetail과 달리 배치요구서 원본 필드를 전부 준다. 필드명 주의:
// 읽기 응답은 suspectBirth/etcLoc1/etcLoc2/deployStatus. mock 필드는 회귀용.
function toDeployDetailUpdate(c: SecurityCase) {
  return {
    deployReqSeq: deploySeqOf(c),
    deployStatus: c.status,
    crimeType: caseTypeToCrimeCode(c.caseType),
    suspectUserName: c.subject.nameInitial,
    suspectGender: c.subject.gender === '여' ? 1 : 0,
    suspectBirth: c.subject.birthDate || null,
    suspectJob: c.subject.occupation || null,
    suspectAddress: c.subject.residence || null,
    caseSummary: c.caseSummary || null,
    periodFrom: c.startDate,
    periodTo: c.endDate,
    requestedEndDate: c.pendingPeriodRequest?.requestedEndDate ?? null,
    guardWorkLoc: c.location.workplace || null,
    guardHomeLoc: c.location.residence || null,
    etcLoc1: c.location.etc1 || null,
    etcLoc2: c.location.etc2 || null,
    caseMemo: c.additionalNotes || null,
    documentDt: c.createdAt ? c.createdAt.slice(0, 10) : null,
    clientDept: c.requester.dept || null,
    clientPosition: c.requester.position || null,
    clientName: c.requester.name || null,
    investigator: c.policeContact.investigator || null,
    responsibleOfficer: c.policeContact.victimOfficer || null,
    mock: c,
  }
}

export const deployTestHandlers = [
  http.get('/api/v1/Deploy/Police/W/GetDeployList', ({ request }) => {
    const account = stationFromBearer(request)
    if (!account || account.role !== '경찰서') {
      return HttpResponse.json(
        { message: '조회 권한이 없는 경찰서입니다.', data: null, code: 403 },
        { status: 403 },
      )
    }

    const keyword = new URL(request.url).searchParams.get('keyword')?.trim()
    const rows = securityCases
      .filter((c) => c.policeStation === account.name)
      .map((c, idx) => ({
        deploySeq: Number(c.id.replace(/\D/g, '')) || idx + 1,
        caseSeq: c.securityCode ? Number(c.securityCode.replace(/\D/g, '')) || null : null,
        mgmtNo: mgmtNo(c.receiptNumber, c.securityCode),
        suspectUserName: c.subject.nameInitial,
        statusName: c.status,
        startDt: c.startDate,
        endDt: c.endDate,
        extendCount: 0,
        remainDays: 0,
      }))
      .filter((r) => !keyword || r.mgmtNo.includes(keyword))

    return HttpResponse.json({ message: 'ok', data: rows, code: 200 })
  }),

  // 화면3: 접수/배치요구서 작성 — POST Deploy/Police/W/AddDeployRequest.
  // 실제 백엔드는 AddDeployRequestDto(서버 구조)를 받는다. 여기서는 그걸 다시
  // SecurityCaseCreateInput(폼 구조)으로 되돌려 mock createSecurityCase에 넘겨,
  // 같은 인메모리 배열(securityCases)에 쌓이게 한다 — GetDeployList 더블과
  // 정합성을 맞추기 위함. groupSeq 검증은 실제 백엔드 몫이라 여기선 생략하고
  // Bearer 토큰으로 소속 경찰서를 판별한다.
  http.post('/api/v1/Deploy/Police/W/AddDeployRequest', async ({ request }) => {
    const account = stationFromBearer(request)
    if (!account || account.role !== '경찰서') {
      return HttpResponse.json(
        { message: '작성 권한이 없습니다.', data: null, code: 403 },
        { status: 403 },
      )
    }

    const dto = (await request.json()) as Record<string, unknown>
    const record = createSecurityCase(account.name, dtoToCreateInput(dto))

    const deploySeq = Number(record.id.replace(/\D/g, '')) || null
    return HttpResponse.json({ message: 'ok', data: { deploySeq }, code: 200 })
  }),

  // 화면5: 배치요구서 수정 prefill — GET Deploy/Police/W/GetDeployDetailUpdate.
  http.get('/api/v1/Deploy/Police/W/GetDeployDetailUpdate', ({ request }) => {
    if (!stationFromBearer(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다.', data: null, code: 401 }, { status: 401 })
    }
    const seq = new URL(request.url).searchParams.get('deployReqSeq')
    const record = findBySeq(seq)
    if (!record) {
      return HttpResponse.json(
        { message: '존재하지 않는 배치요구서입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    return HttpResponse.json({ message: 'ok', data: toDeployDetailUpdate(record), code: 200 })
  }),

  // 화면5: 배치요구서 수정 저장 — PUT Deploy/Police/W/UpdateDeployRequest.
  // DTO를 SecurityCaseCreateInput으로 되돌려 mock updateSecurityCase에 넘긴다.
  http.put('/api/v1/Deploy/Police/W/UpdateDeployRequest', async ({ request }) => {
    const account = stationFromBearer(request)
    if (!account || account.role !== '경찰서') {
      return HttpResponse.json(
        { message: '수정 권한이 없습니다.', data: null, code: 403 },
        { status: 403 },
      )
    }
    const dto = (await request.json()) as Record<string, unknown>
    const record = findBySeq(dto.deployReqSeq)
    if (!record) {
      return HttpResponse.json(
        { message: '존재하지 않는 배치요구서입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    updateSecurityCase(record.id, dtoToCreateInput(dto))
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),

  // 화면4: 경호 상세 조회 — GET Deploy/Police/W/GetDeployDetail?deployReqSeq=
  // (docs/backend-integration/responses/Deploy-Police-GetDeployDetail.md).
  // 조회 전용 role(본청/지역청/게스트)도 이 화면에 들어오므로 role은 제한하지
  // 않고 유효 계정이면 통과시킨다(게스트 케이스 스코프는 matrix 8번에서 처리).
  http.get('/api/v1/Deploy/Police/W/GetDeployDetail', ({ request }) => {
    if (!stationFromBearer(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다.', data: null, code: 401 }, { status: 401 })
    }
    const seq = new URL(request.url).searchParams.get('deployReqSeq')
    const record = findBySeq(seq)
    if (!record) {
      return HttpResponse.json(
        { message: '존재하지 않는 배치요구서입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    return HttpResponse.json({ message: 'ok', data: toDeployDetail(record), code: 200 })
  }),

  // 접수취소 + 경호취소 공용 — POST Deploy/Police/W/CancelGuardCase
  // (docs/backend-integration/responses/Deploy-Police-CancelGuardCase.md).
  http.post('/api/v1/Deploy/Police/W/CancelGuardCase', async ({ request }) => {
    if (!stationFromBearer(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다.', data: null, code: 401 }, { status: 401 })
    }
    const { deployReqSeq, reason } = (await request.json()) as {
      deployReqSeq: unknown
      reason?: string
    }
    const record = findBySeq(deployReqSeq)
    if (!record) {
      return HttpResponse.json(
        { message: '존재하지 않는 배치요구서입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    if (record.status === '접수') {
      cancelPendingCase(record.id)
      return HttpResponse.json({ message: 'ok', data: true, code: 200 })
    }
    const updated = cancelAssignedCase(record.id, String(reason ?? ''))
    if (!updated) {
      return HttpResponse.json({ message: '잘못된 요청입니다.', data: false, code: 400 }, { status: 400 })
    }
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),

  // 연장/단축 요청 — PATCH Deploy/Police/W/ExtendDeployPeriod | ShortenDeployPeriod
  // {deployReqSeq, afterEndDate}. matrix 12번 이후 실측 검증.
  ...(['연장', '단축'] as const).map((type) =>
    http.patch(
      `/api/v1/Deploy/Police/W/${type === '연장' ? 'ExtendDeployPeriod' : 'ShortenDeployPeriod'}`,
      async ({ request }) => {
        if (!stationFromBearer(request)) {
          return HttpResponse.json(
            { message: '인증이 필요합니다.', data: null, code: 401 },
            { status: 401 },
          )
        }
        const { deployReqSeq, afterEndDate } = (await request.json()) as {
          deployReqSeq: unknown
          afterEndDate: string
        }
        const record = findBySeq(deployReqSeq)
        if (!record) {
          return HttpResponse.json(
            { message: '존재하지 않는 배치요구서입니다.', data: null, code: 404 },
            { status: 404 },
          )
        }
        const updated = requestPeriodChange(record.id, type, afterEndDate)
        if (!updated) {
          return HttpResponse.json(
            { message: '요청할 수 없는 상태입니다.', data: false, code: 400 },
            { status: 400 },
          )
        }
        return HttpResponse.json({ message: 'ok', data: true, code: 200 })
      },
    ),
  ),

  // 종결 — POST Deploy/Police/W/CloseGuardCase {caseSeq, endReason}.
  // 프론트가 "사유 - 상세"로 합쳐 보내므로 더블에서 되돌려 나눈다(실제 API는
  // endReason 단일 자유텍스트). matrix 12번 이후 실측 검증.
  http.post('/api/v1/Deploy/Police/W/CloseGuardCase', async ({ request }) => {
    if (!stationFromBearer(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다.', data: null, code: 401 }, { status: 401 })
    }
    const { caseSeq, endReason } = (await request.json()) as { caseSeq: unknown; endReason: string }
    const record = findBySeq(caseSeq)
    if (!record) {
      return HttpResponse.json(
        { message: '존재하지 않는 경호건입니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    const raw = String(endReason ?? '')
    const sep = raw.indexOf(' - ')
    const reason = (sep === -1 ? raw : raw.slice(0, sep)) as ClosureReason
    const detail = sep === -1 ? undefined : raw.slice(sep + 3)
    const updated = closeCase(record.id, reason, detail)
    if (!updated) {
      return HttpResponse.json(
        { message: '종결할 수 없는 상태입니다.', data: false, code: 400 },
        { status: 400 },
      )
    }
    return HttpResponse.json({ message: 'ok', data: true, code: 200 })
  }),
]
