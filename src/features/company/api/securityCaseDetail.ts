import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { splitMgmtNo } from '@/shared/lib/managementNumber'
import { toSeq } from '../../police/api/securityCaseDetail'
import type {
  CaseAttachments,
  CaseBaseInfo,
  CaseType,
  MeasurePeriod,
  PreMeeting,
  ScheduleGroup,
  SecurityCase,
  SecurityCaseStatus,
  WorkSchedule,
} from '../../police/types/securityCase'

// 화면9: [본사] 운영/시스템관리자 · 경호 상세 — 백엔드 연동(matrix 9번).
//
// 상세는 조회 5종으로 쪼개져 있다(스웨거 갱신 확인, 2026-09-04 실측 —
// docs/backend-integration-responses/GuardCase-Stec-GetGuardCaseDetail.md 외):
//   GET GetGuardCaseDetail?caseSeq=  → 경호계획(baseInfo) + 헤더
//   GET GetCaseGuardList?caseSeq=    → 경호원 배정 목록(경호풀, isAssigned)
//   GET GetCaseSchedule?caseSeq=     → 일자별 근무 스케줄
//   GET GetCaseMeeting?caseSeq=      → 사전미팅 (현재 항상 null — 저장 연동은 후속)
//   GET GetCaseDoc?caseSeq=          → 첨부 3종 메타 (업로드 연동은 후속)
//
// 이번 iteration 범위 = 조회 5종 + 경호계획 등록/수정 + 스케줄(자동생성/근무조).
// 사전미팅 저장·파일 업로드 3종·경호취소(본사 API 없음, issues #9)는 후속.

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

async function fetchData<T>(path: string, errorMessage: string): Promise<T> {
  const res = await apiFetch(path)
  if (!res.ok) {
    throw new Error(errorMessage)
  }
  return unwrapEnvelope<T>(res)
}

async function sendJson(
  path: string,
  method: 'PUT' | 'PATCH' | 'POST',
  body: unknown,
  errorMessage: string,
): Promise<void> {
  const res = await apiFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(errorMessage)
  }
}

// "09:00:00" 또는 "2026-09-10T09:00:00" → "09:00"
function hhmm(value: string | null | undefined): string {
  if (!value) return ''
  const time = value.includes('T') ? value.split('T')[1] : value
  return time.slice(0, 5)
}

// 조치 섹션 ↔ summaryN 매핑(사용자 결정 2026-09-04): 폼은 섹션당 다중선택 배열 +
// {시작일,종료일} 기간인데 백엔드는 단일 문자열 2개뿐 → 선택 항목을 ", "로 조인,
// 기간을 "시작일 ~ 종료일" 문자열로 변환해 저장하고 읽을 때 역파싱한다.
// 손실 매핑이라 exclusions.md에 기록, 구조화 요청은 issues.md #11.
function parseMeasureItems(text: string | null): string[] {
  if (!text) return []
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function parseMeasurePeriod(text: string | null): MeasurePeriod | null {
  if (!text) return null
  const [start, end] = text.split('~').map((t) => t.trim())
  if (!start || !end) return null
  return { startDate: start, endDate: end }
}

function joinMeasureItems(items: string[]): string {
  return items.join(', ')
}

function formatMeasurePeriod(period: MeasurePeriod | null): string {
  if (!period?.startDate || !period.endDate) return ''
  return `${period.startDate} ~ ${period.endDate}`
}

// ─── 조회 ────────────────────────────────────────────────────────────────────

interface GuardCaseDetailData {
  caseSeq: number
  mgmtNo: string
  statusName: string
  suspectUserName: string | null
  // 경호계획 등록 후에만 채워진다(미등록이면 전부 null). 등록 판정에 쓴다.
  startDate: string | null
  endDate: string | null
  startTime: string | null
  endTime: string | null
  investigator: string | null
  responsibleOfficer: string | null
  crimeType: string | null
  extendCount: number
  guardHomeLoc: string | null
  guardWorkLoc: string | null
  guardEtcLoc1: string | null
  guardEtcLoc2: string | null
  summary1: string | null
  summary1Date: string | null
  summary2: string | null
  summary2Date: string | null
  summary3: string | null
  summary3Date: string | null
  summary4: string | null
  summary4Date: string | null
  summary5: string | null
  summary5Date: string | null
  destoryDocDownloadYn: boolean
  // 대표근무자(기본 근무자)만 — 이름뿐, guardSeq 없음.
  guardUserList: { guardName: string }[]

  // 테스트 더블(mocks/handlers/guardCaseDetail.ts)만 채우는 필드 — 실제 응답엔 없다.
  // 배정 이후 상태(baseInfo/schedule/attachments)까지 갖춘 화면 회귀를 vitest에서
  // 오프라인 검증하려고 mock 레코드 전체를 실어 보낸다(경찰 화면4의 d.mock과 동일).
  mock?: SecurityCase
}

interface CaseGuardRow {
  guardSeq: number
  name: string
  sabun: string
  deptName: string | null
  isAssigned: boolean
  phone: string | null
}

interface CaseScheduleGuard {
  scheduleDaySeq: number
  guardSeq: number
  guardName: string
  workStartDt: string
  workEndDt: string
  isWork: boolean
  isInPool: boolean
}

interface CaseScheduleDayData {
  groupName: string // 일자 "YYYY-MM-DD"
  groups: { groupSeq: number; order: number; guards: CaseScheduleGuard[] }[]
}

interface CaseDocFile {
  fileName: string | null
}

interface CaseDocData {
  caseInfoDto: CaseDocFile | null
  guardAgreementDtos: {
    guardSeq: number
    guardName: string
    docSeq: number | null
    filePath: string | null
    fileName: string | null
    fileExt: string | null
  }[]
  deploySeq: number
  guardDeployDocDto: CaseDocFile | null
}

// GetCaseMeeting은 현재 모든 케이스에서 data:null이라 스키마 미실측 —
// SaveCaseMeetingDto 기준 추정. 저장 연동(후속) 시 실측으로 확정.
interface CaseMeetingData {
  hasMeeting?: boolean
  meetingStart?: string | null
  meetingEnd?: string | null
  guardSeqs?: number[]
}

function toHeader(id: string, d: GuardCaseDetailData): SecurityCase {
  const split = splitMgmtNo(d.mgmtNo)
  return {
    id,
    receiptNumber: split.receiptNumber,
    securityCode: split.securityCode,
    // 응답에 소속(경찰서/지역청)이 따로 없다 — 접수번호("26-09-동래경찰서")에서
    // 앞 "YY-MM-"만 떼어 경찰서명으로 쓴다.
    policeStation: split.receiptNumber.replace(/^\d{2}-\d{2}-/, ''),
    jurisdiction: '',
    status: d.statusName as SecurityCaseStatus,
    caseType: (d.crimeType as CaseType) || '사건미접수',
    subject: {
      nameInitial: d.suspectUserName ?? '',
      // 성별/생년월일/직업은 이 응답에 없다(경찰 화면5와 동일, exclusions).
      gender: '',
      birthDate: '',
      occupation: '',
      residence: '',
    },
    caseSummary: '',
    startDate: d.startDate ?? '',
    endDate: d.endDate ?? '',
    location: {
      residence: d.guardHomeLoc ?? '',
      workplace: d.guardWorkLoc ?? '',
      etc1: d.guardEtcLoc1 ?? '',
      etc2: d.guardEtcLoc2 ?? '',
    },
    additionalNotes: '',
    policeContact: {
      victimOfficer: d.responsibleOfficer ?? '',
      investigator: d.investigator ?? '',
    },
    // 요구자(부서/직급/성명)는 이 응답에 없다 — 본사가 배치요구서 전문을 보는 API
    // 자체가 없어서다(issues #7 보강).
    requester: { dept: '', position: '', name: '' },
    createdAt: '',
  }
}

function toBaseInfo(d: GuardCaseDetailData, guards: CaseGuardRow[]): CaseBaseInfo {
  // 대표근무자 여부는 조회에 플래그가 없다 — guardUserList(대표만, 이름뿐)에
  // 이름이 있으면 대표로 본다. 동명이인 위험은 감수(exclusions, issues #12).
  const representativeNames = new Set(d.guardUserList.map((g) => g.guardName))
  return {
    workHours: `${hhmm(d.startTime)} ~ ${hhmm(d.endTime)}`,
    defaultWorkers: guards
      .filter((g) => g.isAssigned)
      .map((g) => ({
        workerId: String(g.guardSeq),
        isDefault: representativeNames.has(g.name),
      })),
    investigator: d.investigator ?? '',
    victimOfficer: d.responsibleOfficer ?? '',
    placeResidence: d.guardHomeLoc ?? '',
    placeWorkplace: d.guardWorkLoc ?? '',
    placeEtc1: d.guardEtcLoc1 ?? '',
    placeEtc2: d.guardEtcLoc2 ?? '',
    safetyMeasures: parseMeasureItems(d.summary1),
    emergencyMeasures: parseMeasureItems(d.summary2),
    provisionalMeasures: parseMeasureItems(d.summary3),
    emergencyTempMeasures: parseMeasureItems(d.summary4),
    temporaryMeasures: parseMeasureItems(d.summary5),
    safetyMeasuresPeriod: parseMeasurePeriod(d.summary1Date),
    emergencyMeasuresPeriod: parseMeasurePeriod(d.summary2Date),
    provisionalMeasuresPeriod: parseMeasurePeriod(d.summary3Date),
    emergencyTempMeasuresPeriod: parseMeasurePeriod(d.summary4Date),
    temporaryMeasuresPeriod: parseMeasurePeriod(d.summary5Date),
  }
}

function toPreMeeting(meeting: CaseMeetingData | null): PreMeeting | null {
  if (!meeting || !meeting.hasMeeting || !meeting.meetingStart) return null
  return {
    date: meeting.meetingStart.slice(0, 10),
    // 근무자별 개별 시간은 백엔드가 안 준다 — 전원 같은 구간으로 표시(후속 연동 시 확정).
    assignments: (meeting.guardSeqs ?? []).map((seq) => ({
      workerId: String(seq),
      startTime: hhmm(meeting.meetingStart),
      endTime: hhmm(meeting.meetingEnd),
    })),
  }
}

function toWorkSchedule(
  days: CaseScheduleDayData[],
  meeting: CaseMeetingData | null,
): WorkSchedule {
  return {
    preMeeting: toPreMeeting(meeting),
    days: days.map((day) => ({
      date: day.groupName,
      groups: [...day.groups]
        .sort((a, b) => a.order - b.order)
        .map((g) => ({
          id: String(g.groupSeq),
          // GetCaseSchedule 응답에 그룹 메모가 없다(쓰기 DTO엔 memo 있음) —
          // 저장은 되나 재조회 시 표시 불가(exclusions, issues #12).
          note: '',
          assignments: g.guards.map((gd) => ({
            workerId: String(gd.guardSeq),
            startTime: hhmm(gd.workStartDt),
            endTime: hhmm(gd.workEndDt),
            isOff: !gd.isWork,
          })),
        })),
    })),
  }
}

function toAttachments(doc: CaseDocData): CaseAttachments {
  return {
    securityPlanFileName: doc.caseInfoDto?.fileName ?? null,
    workerConsentFileNames: Object.fromEntries(
      doc.guardAgreementDtos
        .filter((x) => x.fileName)
        .map((x) => [String(x.guardSeq), x.fileName as string]),
    ),
    destructionCertFileName: doc.guardDeployDocDto?.fileName ?? null,
  }
}

export async function getSecurityCase(id: string): Promise<SecurityCase> {
  const caseSeq = encodeURIComponent(id)
  const detail = await fetchData<GuardCaseDetailData>(
    `/v1/GuardCase/Stec/W/GetGuardCaseDetail?caseSeq=${caseSeq}`,
    '경호건을 불러오지 못했습니다',
  )
  const header = toHeader(id, detail)

  // 테스트 더블 경로: mock 레코드 전체를 그대로 얹어 배정 이후 화면 회귀를 검증한다.
  if (detail.mock) {
    return { ...header, ...detail.mock, id }
  }

  const [guards, scheduleDays, doc, meeting] = await Promise.all([
    fetchData<CaseGuardRow[]>(
      `/v1/GuardCase/Stec/W/GetCaseGuardList?caseSeq=${caseSeq}`,
      '근무자 목록을 불러오지 못했습니다',
    ),
    fetchData<CaseScheduleDayData[]>(
      `/v1/GuardCase/Stec/W/GetCaseSchedule?caseSeq=${caseSeq}`,
      '근무 스케줄을 불러오지 못했습니다',
    ),
    fetchData<CaseDocData>(
      `/v1/GuardCase/Stec/W/GetCaseDoc?caseSeq=${caseSeq}`,
      '첨부 정보를 불러오지 못했습니다',
    ),
    fetchData<CaseMeetingData | null>(
      `/v1/GuardCase/Stec/W/GetCaseMeeting?caseSeq=${caseSeq}`,
      '사전미팅 정보를 불러오지 못했습니다',
    ),
  ])

  const planRegistered = detail.startDate != null
  return {
    ...header,
    baseInfo: planRegistered ? toBaseInfo(detail, guards) : undefined,
    workSchedule: scheduleDays.length > 0 ? toWorkSchedule(scheduleDays, meeting) : undefined,
    attachments: toAttachments(doc),
  }
}

// ─── 경호계획 등록/수정 ──────────────────────────────────────────────────────

function toGuardItems(defaultWorkers: CaseBaseInfo['defaultWorkers']) {
  return defaultWorkers.map((w) => ({
    guardSeq: Number(w.workerId),
    isRepresentative: w.isDefault,
  }))
}

function toCaseInfoBody(
  id: string,
  input: CaseBaseInfo,
  subjectName: string,
  period?: { start: string; end: string },
) {
  const [workStart, workEnd] = input.workHours.split('~').map((v) => v.trim())
  const body: Record<string, unknown> = {
    caseSeq: toSeq(id),
    suspectUserName: subjectName,
    guardHomeLoc: input.placeResidence,
    guardWorkLoc: input.placeWorkplace,
    guardEtcLoc1: input.placeEtc1,
    guardEtcLoc2: input.placeEtc2,
    summary1: joinMeasureItems(input.safetyMeasures),
    summary1Date: formatMeasurePeriod(input.safetyMeasuresPeriod),
    summary2: joinMeasureItems(input.emergencyMeasures),
    summary2Date: formatMeasurePeriod(input.emergencyMeasuresPeriod),
    summary3: joinMeasureItems(input.provisionalMeasures),
    summary3Date: formatMeasurePeriod(input.provisionalMeasuresPeriod),
    summary4: joinMeasureItems(input.emergencyTempMeasures),
    summary4Date: formatMeasurePeriod(input.emergencyTempMeasuresPeriod),
    summary5: joinMeasureItems(input.temporaryMeasures),
    summary5Date: formatMeasurePeriod(input.temporaryMeasuresPeriod),
    guards: toGuardItems(input.defaultWorkers),
  }
  // 등록(AddGuardCaseInfo)만 배치기간을 받는다 — startDt/endDt = 배치기간 + 배치시간.
  // 수정(PatchCaseInfo)은 기간이 잠겨 있어(연장·단축으로만 변경) 이 필드가 없다.
  if (period) {
    body.startDt = `${period.start}T${workStart || '09:00'}:00`
    body.endDt = `${period.end}T${workEnd || '18:00'}:00`
  }
  return body
}

interface RegisterBaseInfoOptions {
  // baseInfo가 아직 없으면 등록(PUT AddGuardCaseInfo), 있으면 수정(PATCH PatchCaseInfo).
  isNew: boolean
  // 등록 시에만 필요 — 배치요구서의 배치기간(경호계획 미등록 상태에선 GetGuardCaseDetail이
  // 안 줘서 화면이 빈 값을 넘길 수 있다. blockers.md — 백엔드에 기간 제공 요청).
  period?: { start: string; end: string }
}

export async function registerBaseInfo(
  id: string,
  input: CaseBaseInfo,
  subjectName: string,
  options: RegisterBaseInfoOptions,
): Promise<void> {
  if (options.isNew) {
    await sendJson(
      '/v1/GuardCase/Stec/W/AddGuardCaseInfo',
      'PUT',
      toCaseInfoBody(id, input, subjectName, options.period),
      '경호계획 등록에 실패했습니다',
    )
  } else {
    await sendJson(
      '/v1/GuardCase/Stec/W/PatchCaseInfo',
      'PATCH',
      toCaseInfoBody(id, input, subjectName),
      '경호계획 수정에 실패했습니다',
    )
  }
}

// ─── 근무 스케줄 ────────────────────────────────────────────────────────────

export async function createSchedule(
  id: string,
  input: { startDate: string; endDate: string; startTime: string; endTime: string },
): Promise<void> {
  await sendJson(
    '/v1/GuardCase/Stec/W/AutoAddSchedule',
    'POST',
    {
      caseSeq: toSeq(id),
      startDate: input.startDate,
      endDate: input.endDate,
      // date-span은 "HH:MM:SS"
      startTime: `${input.startTime}:00`,
      endTime: `${input.endTime}:00`,
    },
    '근무 스케줄 생성에 실패했습니다',
  )
}

export async function upsertScheduleGroup(
  id: string,
  date: string,
  group: ScheduleGroup,
  order: number,
): Promise<void> {
  const body: Record<string, unknown> = {
    caseSeq: toSeq(id),
    workDate: date,
    order,
    memo: group.note,
    guards: group.assignments.map((a) => ({
      guardSeq: Number(a.workerId),
      workStart: `${date}T${a.startTime}:00`,
      workEnd: `${date}T${a.endTime}:00`,
      isWork: !a.isOff,
    })),
  }
  // 기존 그룹 수정이면 groupSeq를 실어 보낸다(GetCaseSchedule의 groupSeq → group.id).
  // 신규 그룹은 group.id가 클라이언트 임시값이라 숫자가 아니다 → 생략(= 추가).
  if (/^\d+$/.test(group.id)) {
    body.groupSeq = Number(group.id)
  }
  await sendJson(
    '/v1/GuardCase/Stec/W/PatchScheduleGroup',
    'PUT',
    body,
    '근무 그룹 저장에 실패했습니다',
  )
}

// ─── 후속 연동 예정 (이번 iteration 범위 밖) ────────────────────────────────

const DEFERRED_MESSAGE = '아직 백엔드 연동 전입니다 (화면 9 후속 작업)'

// 경호취소: 본사(Stec) 토큰으로 호출 가능한 케이스 취소 API가 없다 — 유일한
// Deploy/Police/W/CancelGuardCase는 본사 토큰에 403(2026-09-04 실측). issues #9.
// UI는 비활성(SecurityCaseDetailPage) — 시그니처만 유지한다.
export async function cancelAssignedCase(_id: string, _reason: string): Promise<void> {
  void _id
  void _reason
  throw new Error('경호취소 API가 아직 없습니다')
}

// 사전미팅 저장(SaveCaseMeeting) — DTO가 근무자별 시간을 못 받는 등 불일치가 있어
// 후속에서 처리(issues #11). UI도 비활성.
export async function setPreMeeting(_id: string, _preMeeting: PreMeeting | null): Promise<void> {
  void _id
  void _preMeeting
  throw new Error(DEFERRED_MESSAGE)
}

// 파일 업로드 3종(PatchGuardPlanDoc/PatchConsentDoc/PatchDestroyDoc) — multipart
// 재구현 필요. 후속에서 처리. UI도 비활성.
export async function setSecurityPlanFile(_id: string, _fileName: string): Promise<void> {
  void _id
  void _fileName
  throw new Error(DEFERRED_MESSAGE)
}

export async function setDestructionCertFile(_id: string, _fileName: string): Promise<void> {
  void _id
  void _fileName
  throw new Error(DEFERRED_MESSAGE)
}

export async function setWorkerConsentFile(
  _id: string,
  _workerId: string,
  _fileName: string,
): Promise<void> {
  void _id
  void _workerId
  void _fileName
  throw new Error(DEFERRED_MESSAGE)
}
