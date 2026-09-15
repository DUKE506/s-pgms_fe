import { http, HttpResponse } from 'msw'
import { companyAccounts } from '../data/accounts'
import {
  createInitialSchedule,
  deleteScheduleGroup,
  registerBaseInfo,
  securityCases,
  setDestructionCertFile,
  setPreMeeting,
  setSecurityPlanFile,
  setWorkerConsentFile,
  upsertScheduleGroup,
} from '../data/securityCases'
import { workers } from '../data/workers'
import { GUARD_CASE_STATUS_CODE } from '@/shared/lib/deployStatus'
import type {
  CaseBaseInfo,
  MeasurePeriod,
  ScheduleGroup,
  SecurityCase,
} from '../../features/police/types/securityCase'
import { caseTypeToCrimeCode } from '../../shared/lib/crimeType'

// ⚠️ 테스트 전용(mocks/server.ts에서만 등록) — 화면9([본사] 경호 상세)는 실제 백엔드
// GuardCase/Stec/W/{GetGuardCaseDetail,GetCaseGuardList,GetCaseSchedule,GetCaseMeeting,
// GetCaseDoc,AddGuardCaseInfo,PatchCaseInfo,AutoAddSchedule,PatchScheduleGroup}로 연동
// 완료(docs/backend-integration/responses/GuardCase-Stec-GetGuardCaseDetail.md 외).
// 브라우저 dev는 vite 프록시로 실제 백엔드, vitest는 이 더블로 오프라인 검증한다.
//
// 조회는 GetGuardCaseDetail 하나에 mock SecurityCase 레코드 전체를 실어 보내고
// (경찰 화면4의 d.mock과 동일 패턴), features 쪽 getSecurityCase가 그걸 그대로
// 얹는다 — 배정 이후(baseInfo/schedule/attachments)까지 갖춘 화면 회귀를 유지.
// 쓰기 더블은 실제 응답 envelope({message,data,code})만 흉내내고 mock 데이터
// 함수(registerBaseInfo/createInitialSchedule/upsertScheduleGroup)로 같은 인메모리
// 배열을 갱신한다.

function stecUserFromBearer(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '')
  const accountId = token.split('.')[1]
  return companyAccounts.find((a) => a.id === accountId)
}

function findCase(caseSeq: string | null): SecurityCase | undefined {
  if (!caseSeq) return undefined
  return securityCases.find(
    (c) => c.id === caseSeq || String(c.id).replace(/\D/g, '') === caseSeq,
  )
}

function unauthorized() {
  return HttpResponse.json(
    { message: '인증이 필요합니다.', data: null, code: 401 },
    { status: 401 },
  )
}

function envelope<T>(data: T) {
  return HttpResponse.json({ message: 'ok', data, code: 200 })
}

// "09:00:00" | "2026-09-10T09:00:00" → "09:00"
function hhmm(value: string | null | undefined): string {
  if (!value) return ''
  const time = value.includes('T') ? value.split('T')[1] : value
  return time.slice(0, 5)
}

function parseItems(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function parsePeriod(text: string | null | undefined): MeasurePeriod | null {
  if (!text) return null
  const [start, end] = text.split('~').map((t) => t.trim())
  return start && end ? { startDate: start, endDate: end } : null
}

interface CaseInfoDtoBody {
  caseSeq: string | number
  guardHomeLoc?: string
  guardWorkLoc?: string
  guardEtcLoc1?: string
  guardEtcLoc2?: string
  summary1?: string
  summary1Date?: string
  summary2?: string
  summary2Date?: string
  summary3?: string
  summary3Date?: string
  summary4?: string
  summary4Date?: string
  summary5?: string
  summary5Date?: string
  startDt?: string
  endDt?: string
  guards?: { guardSeq: number; isRepresentative: boolean }[]
}

function dtoToBaseInfo(record: SecurityCase, body: CaseInfoDtoBody): CaseBaseInfo {
  const workHours =
    body.startDt && body.endDt
      ? `${hhmm(body.startDt)} ~ ${hhmm(body.endDt)}`
      : (record.baseInfo?.workHours ?? '09:00 ~ 18:00')
  return {
    workHours,
    defaultWorkers: (body.guards ?? []).map((g) => ({
      workerId: String(g.guardSeq),
      isDefault: g.isRepresentative,
    })),
    investigator: record.policeContact.investigator,
    victimOfficer: record.policeContact.victimOfficer,
    placeResidence: body.guardHomeLoc ?? '',
    placeWorkplace: body.guardWorkLoc ?? '',
    placeEtc1: body.guardEtcLoc1 ?? '',
    placeEtc2: body.guardEtcLoc2 ?? '',
    safetyMeasures: parseItems(body.summary1),
    emergencyMeasures: parseItems(body.summary2),
    provisionalMeasures: parseItems(body.summary3),
    emergencyTempMeasures: parseItems(body.summary4),
    temporaryMeasures: parseItems(body.summary5),
    safetyMeasuresPeriod: parsePeriod(body.summary1Date),
    emergencyMeasuresPeriod: parsePeriod(body.summary2Date),
    provisionalMeasuresPeriod: parsePeriod(body.summary3Date),
    emergencyTempMeasuresPeriod: parsePeriod(body.summary4Date),
    temporaryMeasuresPeriod: parsePeriod(body.summary5Date),
  }
}

export const guardCaseDetailTestHandlers = [
  // 경호계획 상세 — 실제 응답 필드 + mock 레코드 전체(d.mock).
  http.get('/api/v1/GuardCase/Stec/W/GetGuardCaseDetail', ({ request }) => {
    const account = stecUserFromBearer(request)
    if (!account) return unauthorized()

    const caseSeq = new URL(request.url).searchParams.get('caseSeq')
    const record = findCase(caseSeq)
    if (!record) {
      return HttpResponse.json(
        { message: '경호건을 찾을 수 없습니다.', data: null, code: 404 },
        { status: 404 },
      )
    }
    if (account.role === '본부관리자' && record.assigneeId !== account.id) {
      return HttpResponse.json(
        { message: '권한이 없습니다.', data: null, code: 403 },
        { status: 403 },
      )
    }

    const plan = record.baseInfo
    return envelope({
      caseSeq: Number(String(record.id).replace(/\D/g, '')) || 0,
      mgmtNo: `${record.receiptNumber} ${record.securityCode ?? '접수'}`,
      // 연장/단축 신청 대기면 실백엔드는 statusName을 "연장"/"단축"으로 준다(findings
      // #19와 같은 문제, 피전 deploy.ts 핸들러와 동일 패턴 — 2026-09-11).
      statusName: record.pendingPeriodRequest ? record.pendingPeriodRequest.type : record.status,
      // 2026-09-15부터 신규 — GetHistoryList/GetGuardCaseList와 같은 코드 체계.
      guardCaseStatus: GUARD_CASE_STATUS_CODE[record.status] ?? null,
      suspectUserName: record.subject.nameInitial,
      startDate: plan ? record.startDate : null,
      endDate: plan ? record.endDate : null,
      startTime: plan ? `${(plan.workHours.split('~')[0] ?? '09:00').trim()}:00` : null,
      endTime: plan ? `${(plan.workHours.split('~')[1] ?? '18:00').trim()}:00` : null,
      investigator: record.policeContact.investigator,
      responsibleOfficer: record.policeContact.victimOfficer,
      crimeType: caseTypeToCrimeCode(record.caseType),
      extendCount: 0,
      guardHomeLoc: plan?.placeResidence ?? null,
      guardWorkLoc: plan?.placeWorkplace ?? null,
      guardEtcLoc1: plan?.placeEtc1 ?? null,
      guardEtcLoc2: plan?.placeEtc2 ?? null,
      summary1: plan?.safetyMeasures.join(', ') ?? null,
      summary1Date: null,
      summary2: plan?.emergencyMeasures.join(', ') ?? null,
      summary2Date: null,
      summary3: plan?.provisionalMeasures.join(', ') ?? null,
      summary3Date: null,
      summary4: plan?.emergencyTempMeasures.join(', ') ?? null,
      summary4Date: null,
      summary5: plan?.temporaryMeasures.join(', ') ?? null,
      summary5Date: null,
      destoryDocDownloadYn: false,
      guardUserList: (plan?.defaultWorkers ?? [])
        .filter((w) => w.isDefault)
        .map((w) => ({ guardName: workers.find((x) => x.id === w.workerId)?.name ?? w.workerId })),
      // features/company/api/securityCaseDetail.ts getSecurityCase가 이걸 그대로 얹는다.
      // deploySeq는 실서버라면 GetCaseDoc이 주는 값 — 더블에선 id 숫자부(deploySeqOf 규칙)로
      // 채워 CancelGuardCase(키가 deployReqSeq)가 찾을 수 있게 한다.
      mock: { ...record, deploySeq: Number(String(record.id).replace(/\D/g, '')) || 0 },
    })
  }),

  // 경호원 배정 목록(경호풀) — 근무자 마스터 전량 + isAssigned/isRepresentative.
  http.get('/api/v1/GuardCase/Stec/W/GetCaseGuardList', ({ request }) => {
    const account = stecUserFromBearer(request)
    if (!account) return unauthorized()
    const caseSeq = new URL(request.url).searchParams.get('caseSeq')
    const record = findCase(caseSeq)
    const defaultWorkers = record?.baseInfo?.defaultWorkers ?? []
    const assignedIds = new Set(defaultWorkers.map((w) => w.workerId))
    const representativeIds = new Set(
      defaultWorkers.filter((w) => w.isDefault).map((w) => w.workerId),
    )
    return envelope(
      workers.map((w) => {
        const guardSeq = String(Number(w.id.replace(/\D/g, '')) || 0)
        return {
          guardSeq: Number(guardSeq),
          name: w.name,
          sabun: w.employeeId,
          deptName: w.department,
          isAssigned: assignedIds.has(guardSeq),
          isRepresentative: representativeIds.has(guardSeq),
          phone: w.phone,
        }
      }),
    )
  }),

  // 경호계획 등록 — PUT AddGuardCaseInfo (스케줄 있으면 409).
  http.put('/api/v1/GuardCase/Stec/W/AddGuardCaseInfo', async ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const body = (await request.json()) as CaseInfoDtoBody
    const record = findCase(String(body.caseSeq))
    if (!record) {
      return HttpResponse.json(
        { message: '경호건을 찾을 수 없습니다.', data: false, code: 404 },
        { status: 404 },
      )
    }
    if (record.workSchedule) {
      return HttpResponse.json(
        {
          message: '이미 스케줄이 만들어진 경호건입니다. 내용은 경호계획 수정을 이용해주세요.',
          data: false,
          code: 409,
        },
        { status: 409 },
      )
    }
    registerBaseInfo(record.id, dtoToBaseInfo(record, body))
    return envelope(true)
  }),

  // 경호계획 부분수정 — PATCH PatchCaseInfo (배치기간 없음).
  http.patch('/api/v1/GuardCase/Stec/W/PatchCaseInfo', async ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const body = (await request.json()) as CaseInfoDtoBody
    const record = findCase(String(body.caseSeq))
    if (!record) {
      return HttpResponse.json(
        { message: '경호건을 찾을 수 없습니다.', data: false, code: 404 },
        { status: 404 },
      )
    }
    registerBaseInfo(record.id, dtoToBaseInfo(record, body))
    return envelope(true)
  }),

  // 스케줄 자동생성 — POST AutoAddSchedule.
  http.post('/api/v1/GuardCase/Stec/W/AutoAddSchedule', async ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const body = (await request.json()) as {
      caseSeq: string | number
      startDate: string
      endDate: string
      startTime: string
      endTime: string
    }
    const record = findCase(String(body.caseSeq))
    const updated = record
      ? createInitialSchedule(record.id, {
          startDate: body.startDate,
          endDate: body.endDate,
          startTime: hhmm(body.startTime),
          endTime: hhmm(body.endTime),
        })
      : null
    if (!updated) {
      return HttpResponse.json(
        { message: '경호계획 등록 후 스케줄을 생성할 수 있습니다.', data: false, code: 409 },
        { status: 409 },
      )
    }
    return envelope(true)
  }),

  // 근무조 저장 — PUT PatchScheduleGroup (groupSeq 있으면 수정, 없으면 추가).
  http.put('/api/v1/GuardCase/Stec/W/PatchScheduleGroup', async ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const body = (await request.json()) as {
      groupSeq?: number
      caseSeq: string | number
      workDate: string
      order: number
      memo?: string
      guards?: { guardSeq: number; workStart: string; workEnd: string; isWork: boolean }[]
    }
    const record = findCase(String(body.caseSeq))
    if (!record?.workSchedule) {
      return HttpResponse.json(
        { message: '스케줄을 찾을 수 없습니다.', data: false, code: 404 },
        { status: 404 },
      )
    }
    const day = record.workSchedule.days.find((d) => d.date === body.workDate)
    let groupId: string
    if (body.groupSeq != null) {
      groupId = String(body.groupSeq)
    } else if (day?.groups[body.order - 1]) {
      // 이미 그 순번에 그룹이 있으면(자동생성된 그룹1 등) 그 id를 유지해 in-place 교체.
      groupId = day.groups[body.order - 1].id
    } else {
      // 신규 그룹 — 실제 백엔드가 groupSeq(정수)를 발급하는 것을 흉내내 숫자 id를 준다
      // (재조회 후 group.id가 숫자여야 ScheduleGroupDialog의 삭제 버튼이 뜬다).
      groupId = String(Date.now())
    }
    const group: ScheduleGroup = {
      id: groupId,
      note: body.memo ?? '',
      assignments: (body.guards ?? []).map((g) => ({
        workerId: String(g.guardSeq),
        startTime: hhmm(g.workStart),
        endTime: hhmm(g.workEnd),
        isOff: !g.isWork,
      })),
    }
    upsertScheduleGroup(record.id, body.workDate, group)
    return envelope(true)
  }),

  // 사전미팅 저장/삭제 — PUT SaveCaseMeeting.
  http.put('/api/v1/GuardCase/Stec/W/SaveCaseMeeting', async ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const body = (await request.json()) as {
      caseSeq: string | number
      hasMeeting?: boolean
      meetingStart?: string | null
      meetingEnd?: string | null
      guardSeqs?: number[]
    }
    const record = findCase(String(body.caseSeq))
    if (!record?.workSchedule) {
      return HttpResponse.json(
        { message: '스케줄을 찾을 수 없습니다.', data: false, code: 404 },
        { status: 404 },
      )
    }
    const preMeeting =
      body.hasMeeting && body.meetingStart
        ? {
            date: body.meetingStart.slice(0, 10),
            startTime: hhmm(body.meetingStart),
            endTime: hhmm(body.meetingEnd),
            workerIds: (body.guardSeqs ?? []).map((seq) => String(seq)),
          }
        : null
    setPreMeeting(record.id, preMeeting)
    return envelope(true)
  }),

  // 첨부 업로드 3종 — multipart/form-data. 실제 응답은 저장 경로 문자열(data).
  http.put('/api/v1/GuardCase/Stec/W/PatchGuardPlanDoc', async ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const form = await request.formData()
    const record = findCase(String(form.get('caseSeq')))
    const file = form.get('file') as File | null
    if (!record || !file) {
      return HttpResponse.json({ message: '잘못된 요청', data: null, code: 400 }, { status: 400 })
    }
    setSecurityPlanFile(record.id, file.name)
    return envelope(`guardcase/${record.id}/${file.name}`)
  }),

  http.put('/api/v1/GuardCase/Stec/W/PatchConsentDoc', async ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const form = await request.formData()
    const record = findCase(String(form.get('caseSeq')))
    const guardSeq = String(form.get('guardSeq') ?? '')
    const file = form.get('file') as File | null
    if (!record || !file || !guardSeq) {
      return HttpResponse.json({ message: '잘못된 요청', data: null, code: 400 }, { status: 400 })
    }
    setWorkerConsentFile(record.id, guardSeq, file.name)
    return envelope(`guardcase/${record.id}/${file.name}`)
  }),

  http.put('/api/v1/GuardCase/Stec/W/PatchDestroyDoc', async ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const form = await request.formData()
    const record = findCase(String(form.get('caseSeq')))
    const file = form.get('file') as File | null
    if (!record || !file) {
      return HttpResponse.json({ message: '잘못된 요청', data: null, code: 400 }, { status: 400 })
    }
    if (record.status !== '경호중' && record.status !== '경호완료') {
      return HttpResponse.json(
        {
          message: `파기확인서는 경호중·경호완료 상태에서만 등록할 수 있습니다. (현재 ${record.status})`,
          data: null,
          code: 409,
        },
        { status: 409 },
      )
    }
    setDestructionCertFile(record.id, file.name)
    return envelope(`guardcase/${record.id}/${file.name}`)
  }),

  // 파기확인서 다운로드 — 실제는 바이너리. 더블은 파일명만 Content-Disposition에 실어 준다.
  http.get('/api/v1/GuardCase/Stec/W/GetDestroyDocDownload', ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const caseSeq = new URL(request.url).searchParams.get('caseSeq')
    const record = findCase(caseSeq)
    const name = record?.attachments?.destructionCertFileName
    if (!name) {
      return HttpResponse.json({ message: '파일 없음', data: null, code: 404 }, { status: 404 })
    }
    return new HttpResponse(new Blob(['%PDF-1.4 mock'], { type: 'application/octet-stream' }), {
      headers: { 'Content-Disposition': `attachment; filename=${name}` },
    })
  }),

  // 근무조 삭제 — DELETE DeleteScheduleGroup?groupSeq=&caseSeq=.
  http.delete('/api/v1/GuardCase/Stec/W/DeleteScheduleGroup', ({ request }) => {
    if (!stecUserFromBearer(request)) return unauthorized()
    const url = new URL(request.url)
    const caseSeq = url.searchParams.get('caseSeq')
    const groupSeq = url.searchParams.get('groupSeq') ?? ''
    const record = findCase(caseSeq)
    const updated = record ? deleteScheduleGroup(record.id, groupSeq) : null
    if (!updated) {
      return HttpResponse.json(
        { message: '삭제할 수 없는 그룹입니다.', data: false, code: 400 },
        { status: 400 },
      )
    }
    return envelope(true)
  }),
]
