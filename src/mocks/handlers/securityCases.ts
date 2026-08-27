import { http, HttpResponse } from 'msw'
import { companyAccounts, policeAccounts } from '../data/accounts'
import {
  approvePeriodRequest,
  assignManager,
  cancelAssignedCase,
  cancelPendingCase,
  closeCase,
  createInitialSchedule,
  createSecurityCase,
  findSecurityCase,
  registerBaseInfo,
  rejectPeriodRequest,
  requestPeriodChange,
  securityCases,
  setDestructionCertFile,
  setPreMeeting,
  setSecurityPlanFile,
  setWorkerConsentFile,
  updateSecurityCase,
  upsertScheduleGroup,
} from '../data/securityCases'
import type {
  CaseBaseInfo,
  ClosureReason,
  ScheduleGroup,
  SecurityCaseCreateInput,
  WorkSchedule,
} from '../../features/police/types/securityCase'

function accountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return policeAccounts.find((a) => a.id === accountId)
}

function companyAccountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return companyAccounts.find((a) => a.id === accountId)
}

export const securityCaseHandlers = [
  http.post('/api/security-cases', async ({ request }) => {
    const account = accountFromAuthHeader(request)
    if (!account) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const input = (await request.json()) as SecurityCaseCreateInput
    const record = createSecurityCase(account.name, input)
    return HttpResponse.json(record, { status: 201 })
  }),

  // 화면5: 피전이 자기가 작성한 배치요구서를 수정 (경찰 전용 — 본사는 별도
  // PUT /:id/base-info로 기본정보를 등록/수정한다)
  http.put('/api/security-cases/:id', async ({ request, params }) => {
    if (!accountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const input = (await request.json()) as SecurityCaseCreateInput
    const updated = updateSecurityCase(params.id as string, input)
    if (!updated) {
      return HttpResponse.json({ message: '경호건을 찾을 수 없습니다' }, { status: 404 })
    }
    return HttpResponse.json(updated)
  }),

  http.get('/api/security-cases', ({ request }) => {
    const companyAccount = companyAccountFromAuthHeader(request)
    if (companyAccount) {
      const status = new URL(request.url).searchParams.get('status')
      const list = status ? securityCases.filter((c) => c.status === status) : securityCases
      return HttpResponse.json(list)
    }

    const policeAccount = accountFromAuthHeader(request)
    if (policeAccount) {
      // 경찰서 계정은 자기 경찰서 소속 건만 조회 — 계정명이 곧 policeStation 값과
      // 일치하도록 mock 데이터가 구성돼 있다(mocks/data/accounts.ts). 게스트 계정은
      // 아직 화면 9/10(게스트 계정 발급/특정 건 할당)이 미구현이라 할당된 건이
      // 없으므로 빈 목록을 반환한다.
      const list =
        policeAccount.role === '경찰서'
          ? securityCases.filter((c) => c.policeStation === policeAccount.name)
          : []
      return HttpResponse.json(list)
    }

    return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
  }),

  // 화면 1h/2h/8: 이력 조회 — 조직 계층에 따라 스코프와 대상 상태가 모두 다르다.
  // 본청/지역청은 Phase4 대시보드가 아직 없어 진행중 건을 확인할 다른 방법이
  // 없으므로 전체 상태를 다 보여주고(2026-08-27 사용자 결정), 경찰서는 이미
  // 경호목록(/security-cases) 화면이 있어 원래 설계대로 종결/취소만 유지한다.
  // GET /security-cases/:id와 경로가 겹치므로(:id에 "history"가 매칭됨) 그
  // 핸들러보다 먼저 등록해야 한다.
  http.get('/api/security-cases/history', ({ request }) => {
    const policeAccount = accountFromAuthHeader(request)
    if (!policeAccount) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const list = securityCases.filter((c) => {
      if (policeAccount.role === '본청') return true
      if (policeAccount.role === '지역청') return c.jurisdiction === policeAccount.jurisdiction
      if (policeAccount.role === '경찰서') {
        return c.policeStation === policeAccount.name && (c.status === '종결' || c.status === '취소')
      }
      return false
    })
    return HttpResponse.json(list)
  }),

  http.get('/api/security-cases/history/:id', ({ request, params }) => {
    const policeAccount = accountFromAuthHeader(request)
    if (!policeAccount) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const record = findSecurityCase(params.id as string)
    if (!record || (record.status !== '종결' && record.status !== '취소')) {
      return HttpResponse.json({ message: '이력을 찾을 수 없습니다' }, { status: 404 })
    }

    const allowed =
      policeAccount.role === '본청' ||
      (policeAccount.role === '지역청' && record.jurisdiction === policeAccount.jurisdiction) ||
      (policeAccount.role === '경찰서' && record.policeStation === policeAccount.name)
    if (!allowed) {
      return HttpResponse.json({ message: '권한이 없습니다' }, { status: 403 })
    }

    return HttpResponse.json(record)
  }),

  http.post('/api/security-cases/:id/assign', async ({ request, params }) => {
    const account = companyAccountFromAuthHeader(request)
    if (!account) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const { managerId } = (await request.json()) as { managerId: string }
    const manager = companyAccounts.find((a) => a.id === managerId && a.role === '본부관리자')
    if (!manager) {
      return HttpResponse.json({ message: '담당자를 찾을 수 없습니다' }, { status: 400 })
    }

    const updated = assignManager(params.id as string, manager.name)
    if (!updated) {
      return HttpResponse.json({ message: '배정할 수 없는 상태입니다' }, { status: 409 })
    }

    return HttpResponse.json(updated)
  }),

  // 접수취소: 상태값 없이 DB에서 삭제. 화면5(경찰 상세)에도 같은 버튼이 있어
  // 경찰 계정도 허용한다.
  http.delete('/api/security-cases/:id', ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request) && !accountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const ok = cancelPendingCase(params.id as string)
    if (!ok) {
      return HttpResponse.json({ message: '취소할 수 없는 상태입니다' }, { status: 409 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  // 경호취소: 배정 상태 이후 사유와 함께 '취소' 상태로 전환. 화면5(경찰 상세)에도
  // 같은 버튼이 있어 경찰 계정도 허용한다.
  http.put('/api/security-cases/:id/cancel', async ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request) && !accountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const { reason } = (await request.json()) as { reason: string }
    const updated = cancelAssignedCase(params.id as string, reason)
    if (!updated) {
      return HttpResponse.json({ message: '취소할 수 없는 상태입니다' }, { status: 409 })
    }
    return HttpResponse.json(updated)
  }),

  // 화면 5: 경호중 상태에서 연장/단축 요청 제출 (경찰 전용 — 승인은 본사 승인
  // 화면(후속 항목) 몫이라 여기선 대기 상태로만 남긴다)
  http.post('/api/security-cases/:id/period-request', async ({ request, params }) => {
    if (!accountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const { type, requestedEndDate } = (await request.json()) as {
      type: '연장' | '단축'
      requestedEndDate: string
    }
    const updated = requestPeriodChange(params.id as string, type, requestedEndDate)
    if (!updated) {
      return HttpResponse.json({ message: '요청할 수 없는 상태입니다' }, { status: 409 })
    }
    return HttpResponse.json(updated)
  }),

  // [본사] 연장요청/단축요청 승인/거부 (본사 전용 — 승인 시 startDate/endDate와
  // workSchedule.days를 함께 조정한다)
  http.put('/api/security-cases/:id/period-request/approve', ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const updated = approvePeriodRequest(params.id as string)
    if (!updated) {
      return HttpResponse.json({ message: '승인할 수 없는 상태입니다' }, { status: 409 })
    }
    return HttpResponse.json(updated)
  }),

  http.put('/api/security-cases/:id/period-request/reject', ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const updated = rejectPeriodRequest(params.id as string)
    if (!updated) {
      return HttpResponse.json({ message: '거부할 수 없는 상태입니다' }, { status: 409 })
    }
    return HttpResponse.json(updated)
  }),

  // 화면 5: 경호완료 → 종결 전환 (경찰 전용, 파기확인서 업로드 후에만 가능)
  http.put('/api/security-cases/:id/close', async ({ request, params }) => {
    if (!accountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const { closureReason, closureReasonDetail } = (await request.json()) as {
      closureReason: ClosureReason
      closureReasonDetail?: string
    }
    const updated = closeCase(params.id as string, closureReason, closureReasonDetail)
    if (!updated) {
      return HttpResponse.json({ message: '종결할 수 없는 상태입니다' }, { status: 409 })
    }
    return HttpResponse.json(updated)
  }),

  http.get('/api/security-cases/:id', ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request) && !accountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const record = findSecurityCase(params.id as string)
    if (!record) {
      return HttpResponse.json({ message: '경호건을 찾을 수 없습니다' }, { status: 404 })
    }
    return HttpResponse.json(record)
  }),

  // 화면 7c: 기본정보 등록/수정
  http.put('/api/security-cases/:id/base-info', async ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const input = (await request.json()) as CaseBaseInfo
    const updated = registerBaseInfo(params.id as string, input)
    if (!updated) {
      return HttpResponse.json({ message: '경호건을 찾을 수 없습니다' }, { status: 404 })
    }
    return HttpResponse.json(updated)
  }),

  // 화면 7e: 배치기간+근무시간 입력 → 일자별 스케줄 자동 생성
  http.post('/api/security-cases/:id/schedule', async ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const input = (await request.json()) as {
      startDate: string
      endDate: string
      startTime: string
      endTime: string
    }
    const updated = createInitialSchedule(params.id as string, input)
    if (!updated) {
      return HttpResponse.json(
        { message: '기본정보 등록 후 스케줄을 생성할 수 있습니다' },
        { status: 409 },
      )
    }
    return HttpResponse.json(updated)
  }),

  // 화면 7b: 특정 일자의 근무 그룹 추가/수정
  http.put('/api/security-cases/:id/schedule/:date/groups', async ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const group = (await request.json()) as ScheduleGroup
    const updated = upsertScheduleGroup(params.id as string, params.date as string, group)
    if (!updated) {
      return HttpResponse.json({ message: '스케줄을 찾을 수 없습니다' }, { status: 404 })
    }
    return HttpResponse.json(updated)
  }),

  http.put('/api/security-cases/:id/schedule/pre-meeting', async ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }

    const preMeeting = (await request.json()) as WorkSchedule['preMeeting']
    const updated = setPreMeeting(params.id as string, preMeeting)
    if (!updated) {
      return HttpResponse.json({ message: '스케줄을 찾을 수 없습니다' }, { status: 404 })
    }
    return HttpResponse.json(updated)
  }),

  // 첨부(경호계획서/개인정보동의서/파기확인서): 실제 업로드 없이 파일명만 저장
  http.put('/api/security-cases/:id/attachments/security-plan', async ({ request, params }) => {
    if (!companyAccountFromAuthHeader(request)) {
      return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    }
    const { fileName } = (await request.json()) as { fileName: string }
    const updated = setSecurityPlanFile(params.id as string, fileName)
    if (!updated) {
      return HttpResponse.json({ message: '경호건을 찾을 수 없습니다' }, { status: 404 })
    }
    return HttpResponse.json(updated)
  }),

  http.put(
    '/api/security-cases/:id/attachments/destruction-cert',
    async ({ request, params }) => {
      if (!companyAccountFromAuthHeader(request)) {
        return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
      }
      const { fileName } = (await request.json()) as { fileName: string }
      const updated = setDestructionCertFile(params.id as string, fileName)
      if (!updated) {
        return HttpResponse.json({ message: '경호건을 찾을 수 없습니다' }, { status: 404 })
      }
      return HttpResponse.json(updated)
    },
  ),

  http.put(
    '/api/security-cases/:id/attachments/worker-consent/:workerId',
    async ({ request, params }) => {
      if (!companyAccountFromAuthHeader(request)) {
        return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
      }
      const { fileName } = (await request.json()) as { fileName: string }
      const updated = setWorkerConsentFile(
        params.id as string,
        params.workerId as string,
        fileName,
      )
      if (!updated) {
        return HttpResponse.json({ message: '경호건을 찾을 수 없습니다' }, { status: 404 })
      }
      return HttpResponse.json(updated)
    },
  ),
]
