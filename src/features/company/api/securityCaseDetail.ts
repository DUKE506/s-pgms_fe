import { apiFetch } from '../../auth/api/client'
import { assertOk, unwrapEnvelope } from '@/shared/api/envelope'
import { splitMgmtNo } from '@/shared/lib/managementNumber'
import { genderCodeToLabel } from '@/shared/lib/subject'
import { crimeCodeToCaseType } from '@/shared/lib/crimeType'
import { resolveDeployStatus } from '@/shared/lib/deployStatus'
import {
  EMERGENCY_MEASURE_OPTIONS,
  EMERGENCY_TEMP_MEASURE_OPTIONS,
  PROVISIONAL_MEASURE_OPTIONS,
  SAFETY_MEASURE_OPTIONS,
  TEMPORARY_MEASURE_OPTIONS,
  formatMeasurePeriod,
  hhmm,
  joinMeasureItemsAsBits,
  parseMeasureItems,
  parseMeasurePeriod,
} from '@/shared/lib/caseMeasures'
import { toSeq } from '../../police/api/securityCaseDetail'
import type {
  CaseAttachments,
  CaseBaseInfo,
  PreMeeting,
  ScheduleGroup,
  SecurityCase,
  WorkSchedule,
} from '../../police/types/securityCase'

// 화면9: [본사] 운영/시스템관리자 · 경호 상세 — 백엔드 연동(matrix 9번).
//
// 상세는 조회 5종으로 쪼개져 있다(스웨거 갱신 확인, 2026-09-04 실측 —
// docs/backend-integration/responses/GuardCase-Stec-GetGuardCaseDetail.md 외):
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
  assertOk(res, errorMessage)
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

// 조치 5개 ↔ summaryN 매핑 / 시각 포맷 헬퍼는 피전 상세와 공유한다
// (@/shared/lib/caseMeasures). 손실 매핑 근거는 exclusions.md, 구조화 요청은 issues.md #11.

// 연장/단축 신청 대기 여부 — GetGuardCaseDetail의 statusName은 신청 중이어도
// "경호중" 그대로다(피전 GetDeployDetail과 달리 실측 확인, 2026-09-11 — toHeader의
// resolveDeployStatus 정규화는 그래서 이 엔드포인트엔 사실상 적용될 일이 없고, 나중에
// 백엔드가 이 응답에도 신호를 넣어주면 대비용으로만 남는다). 대신 연장/단축 요청
// 목록(화면10, GetExtendRequestList·GetShortenRequestList)에 이 caseSeq가 있는지로
// 판정한다 — 경호중 건에서만 뜻이 있어 그때만 호출한다.
interface PeriodRequestExistsRow {
  caseSeq: number
}

async function findPendingPeriodRequestType(
  caseSeq: string,
): Promise<'연장' | '단축' | undefined> {
  // 안내문구는 부가 정보다 — 이 조회가 실패해도(스코프 등) 상세 화면 전체가
  // 깨지면 안 되므로 실패 시 조용히 undefined(문구 없음)로 넘어간다.
  try {
    const [extend, shorten] = await Promise.all([
      fetchData<PeriodRequestExistsRow[]>(
        '/v1/GuardCase/Stec/W/GetExtendRequestList',
        '연장 요청 목록을 불러오지 못했습니다',
      ),
      fetchData<PeriodRequestExistsRow[]>(
        '/v1/GuardCase/Stec/W/GetShortenRequestList',
        '단축 요청 목록을 불러오지 못했습니다',
      ),
    ])
    if (extend.some((r) => String(r.caseSeq) === caseSeq)) return '연장'
    if (shorten.some((r) => String(r.caseSeq) === caseSeq)) return '단축'
    return undefined
  } catch {
    return undefined
  }
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
  // 대표근무자 여부 — 2026-09-14 백엔드가 실값으로 채워주기 시작(findings #12 해소).
  isRepresentative: boolean
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
  groups: {
    groupSeq: number
    order: number
    // 근무조 특이사항(PatchScheduleGroup.memo로 저장). 2026-09-10 실측 — GetCaseSchedule
    // 응답 그룹 항목에 포함되기 시작(findings #12 memo 갭 해소). 미입력이면 null.
    memo?: string | null
    guards: CaseScheduleGuard[]
  }[]
}

// GetCaseDoc 실측(2026-09-04 — GuardCase-Stec-CaseMeeting.md/CaseDoc):
//  caseInfoDto      → 경호계획서 (PatchGuardPlanDoc)
//  guardAgreementDtos[] → 경호풀 근무자별 개인정보동의서 (PatchConsentDoc)
//  guardDeployDocDto → 파기확인서 (PatchDestroyDoc, filePath 없음)
interface CaseDocFile {
  docSeq: number | null
  filePath?: string | null
  fileName: string | null
  fileExt: string | null
}

interface CaseDocData {
  caseInfoDto: CaseDocFile | null
  guardAgreementDtos: ({
    guardSeq: number
    guardName: string
  } & CaseDocFile)[]
  deploySeq: number
  guardDeployDocDto: CaseDocFile | null
}

// GetCaseMeeting 응답(실측 2026-09-04 — GuardCase-Stec-CaseMeeting.md). 미팅 없으면
// data:null. 근무자별 개별 시간은 없다(미팅 전체 1구간 + 참석 근무자 목록).
interface CaseMeetingData {
  meetingSeq: number
  meetingDate: string
  meetingStartDt: string
  meetingEndDt: string
  guardInfo: { guardSeq: number; guardName: string }[]
}

function toHeader(id: string, d: GuardCaseDetailData): SecurityCase {
  const split = splitMgmtNo(d.mgmtNo)
  // 연장/단축 신청 대기 건은 statusName이 "연장"/"단축"으로 온다(피전 GetDeployDetail과
  // 같은 문제, findings #19) — 경호중으로 정규화하고 신청 대기 여부는 별도로 뽑아
  // 상세 배지 옆 안내문구에 쓴다(사용자 요청, 2026-09-11). 요청일/희망종료일은 이
  // 응답에 없어(연장/단축 요청 목록 화면 소관) requestedEndDate/requestedAt은 빈 값.
  const { status, pendingRequestType } = resolveDeployStatus(d.statusName)
  return {
    id,
    receiptNumber: split.receiptNumber,
    securityCode: split.securityCode,
    // 응답에 소속(경찰서/지역청)이 따로 없다 — 접수번호("26-09-동래경찰서")에서
    // 앞 "YY-MM-"만 떼어 경찰서명으로 쓴다.
    policeStation: split.receiptNumber.replace(/^\d{2}-\d{2}-/, ''),
    jurisdiction: '',
    status,
    ...(pendingRequestType
      ? { pendingPeriodRequest: { type: pendingRequestType, requestedEndDate: '', requestedAt: '' } }
      : {}),
    caseType: crimeCodeToCaseType(d.crimeType),
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
  return {
    workHours: `${hhmm(d.startTime)} ~ ${hhmm(d.endTime)}`,
    defaultWorkers: guards
      .filter((g) => g.isAssigned)
      .map((g) => ({
        workerId: String(g.guardSeq),
        // 2026-09-14부터 GetCaseGuardList가 실값을 준다(findings #12 해소) — 예전엔
        // guardUserList(대표만, 이름뿐)에 이름이 있으면 대표로 추정했음(동명이인 취약).
        isDefault: g.isRepresentative,
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
  if (!meeting) return null
  return {
    date: meeting.meetingDate,
    startTime: hhmm(meeting.meetingStartDt),
    endTime: hhmm(meeting.meetingEndDt),
    workerIds: meeting.guardInfo.map((g) => String(g.guardSeq)),
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
          // 근무조 특이사항 — PatchScheduleGroup.memo로 저장하고 GetCaseSchedule
          // 응답에서 되읽는다(2026-09-10 백엔드 반영, findings #12).
          note: g.memo ?? '',
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
    // 경호계획서·동의서는 filePath를 /files/<path>로 받는다(전용 API 없음).
    securityPlanFilePath: doc.caseInfoDto?.filePath ?? null,
    workerConsentFileNames: Object.fromEntries(
      doc.guardAgreementDtos
        .filter((x) => x.fileName)
        .map((x) => [String(x.guardSeq), x.fileName as string]),
    ),
    workerConsentFilePaths: Object.fromEntries(
      doc.guardAgreementDtos
        .filter((x) => x.filePath)
        .map((x) => [String(x.guardSeq), x.filePath as string]),
    ),
    destructionCertFileName: doc.guardDeployDocDto?.fileName ?? null,
  }
}

// GET GuardCase/Stec/W/GetDeployDetail?deployReqSeq= — 본사용 배치요구서 원본
// (2026-09-07 실측 — docs/backend-integration/responses/GuardCase-Stec-GetDeployDetail.md).
// GetGuardCaseDetail(경호계획 뷰)이 안 주는 원본 필드(요구자 3필드·사건개요·참고사항·
// 성별/생년/직업/거주지·배치장소·문서 등록일)를 보완하고, 경호계획 미등록 배정 건의
// 배치기간(periodFrom/periodTo)을 준다(issues #7·#10). 경찰용 Deploy/Police/W/GetDeployDetail과
// 경로가 겹치므로 주의. 필드명: 읽기 응답은 suspectBirth/etcLoc1/etcLoc2
// (쓰기 DTO는 suspectBirthDate/guardEtcLoc1/guardEtcLoc2).
// 이 응답의 crimeType/suspectUserName/investigator/responsibleOfficer는 화면9(경호
// 상세)에서는 안 읽는다 — GetGuardCaseDetail(toHeader)이 이미 채우기 때문. 화면7
// (배치요청 목록, requests.ts::getDeployRequestDetail)은 배정 전이라 GetGuardCaseDetail
// 자체가 없어 이 필드들이 유일한 소스라 함께 export한다.
export interface DeployRequestDetailData {
  deployReqSeq: number
  crimeType: string | null
  suspectUserName: string | null
  suspectGender: number | null
  suspectBirth: string | null
  suspectJob: string | null
  suspectAddress: string | null
  caseSummary: string | null
  caseMemo: string | null
  periodFrom: string | null
  periodTo: string | null
  guardHomeLoc: string | null
  guardWorkLoc: string | null
  etcLoc1: string | null
  etcLoc2: string | null
  documentDt: string | null
  clientDept: string | null
  clientPosition: string | null
  clientName: string | null
  investigator: string | null
  responsibleOfficer: string | null
}

export async function fetchDeployRequestDetail(
  deploySeq: number,
): Promise<DeployRequestDetailData | null> {
  try {
    return await fetchData<DeployRequestDetailData>(
      `/v1/GuardCase/Stec/W/GetDeployDetail?deployReqSeq=${deploySeq}`,
      '배치요구서를 불러오지 못했습니다',
    )
  } catch {
    // 배치요구서 원본을 못 받아도 상세 화면 자체는 떠야 한다(요약/스케줄/첨부는 유효).
    return null
  }
}

// GetGuardCaseDetail이 못 주는 배치요구서 원본 필드를 채워 넣는다. 이미 값이 있는
// 필드(경호계획 등록 후 채워지는 배치기간·배치장소)는 유지하고 빈 값만 보완한다.
function mergeDeployRequest(sc: SecurityCase, d: DeployRequestDetailData): SecurityCase {
  return {
    ...sc,
    subject: {
      ...sc.subject,
      gender: d.suspectGender != null ? genderCodeToLabel(d.suspectGender) : sc.subject.gender,
      birthDate: d.suspectBirth ?? sc.subject.birthDate,
      occupation: d.suspectJob ?? sc.subject.occupation,
      residence: d.suspectAddress ?? sc.subject.residence,
    },
    caseSummary: d.caseSummary ?? sc.caseSummary,
    additionalNotes: d.caseMemo ?? sc.additionalNotes,
    // 경호계획 미등록이면 GetGuardCaseDetail이 기간을 null로 준다 → 배치요구서 기간으로.
    startDate: sc.startDate || d.periodFrom || '',
    endDate: sc.endDate || d.periodTo || '',
    location: {
      residence: sc.location.residence || d.guardHomeLoc || '',
      workplace: sc.location.workplace || d.guardWorkLoc || '',
      etc1: sc.location.etc1 || d.etcLoc1 || '',
      etc2: sc.location.etc2 || d.etcLoc2 || '',
    },
    requester: {
      dept: d.clientDept ?? '',
      position: d.clientPosition ?? '',
      name: d.clientName ?? '',
    },
    createdAt: sc.createdAt || d.documentDt || '',
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

  const [guards, scheduleDays, doc, meeting, pendingRequestType] = await Promise.all([
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
    // 연장/단축 신청은 경호중 건에서만 뜻이 있다 — 그 외 상태는 조회 자체를 건너뛴다.
    header.status === '경호중' ? findPendingPeriodRequestType(id) : Promise.resolve(undefined),
  ])

  // 배치요구서 원본(deploySeq는 GetCaseDoc이 준다 — 46→81 등).
  const deployReq = await fetchDeployRequestDetail(doc.deploySeq)

  const planRegistered = detail.startDate != null
  const result: SecurityCase = {
    ...header,
    // deployReqSeq — 경호취소(CancelGuardCase)가 caseSeq가 아닌 이 값을 키로 받는다.
    deploySeq: doc.deploySeq,
    baseInfo: planRegistered ? toBaseInfo(detail, guards) : undefined,
    workSchedule: scheduleDays.length > 0 ? toWorkSchedule(scheduleDays, meeting) : undefined,
    attachments: toAttachments(doc),
    // header가 이미 statusName 기반으로 채웠으면 그걸 우선(요청 종료일 포함), 아니면
    // 연장/단축 요청 목록 조회 결과로 보강(현재 실백엔드 경로 — 위 주석 참고).
    ...(!header.pendingPeriodRequest && pendingRequestType
      ? {
          pendingPeriodRequest: { type: pendingRequestType, requestedEndDate: '', requestedAt: '' },
        }
      : {}),
  }
  return deployReq ? mergeDeployRequest(result, deployReq) : result
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
    summary1: joinMeasureItemsAsBits(input.safetyMeasures, SAFETY_MEASURE_OPTIONS),
    summary1Date: formatMeasurePeriod(input.safetyMeasuresPeriod),
    summary2: joinMeasureItemsAsBits(input.emergencyMeasures, EMERGENCY_MEASURE_OPTIONS),
    summary2Date: formatMeasurePeriod(input.emergencyMeasuresPeriod),
    summary3: joinMeasureItemsAsBits(input.provisionalMeasures, PROVISIONAL_MEASURE_OPTIONS),
    summary3Date: formatMeasurePeriod(input.provisionalMeasuresPeriod),
    summary4: joinMeasureItemsAsBits(input.emergencyTempMeasures, EMERGENCY_TEMP_MEASURE_OPTIONS),
    summary4Date: formatMeasurePeriod(input.emergencyTempMeasuresPeriod),
    summary5: joinMeasureItemsAsBits(input.temporaryMeasures, TEMPORARY_MEASURE_OPTIONS),
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
  const res = await apiFetch('/v1/GuardCase/Stec/W/PatchScheduleGroup', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    // 경호풀(기본정보에 등록된 근무자) 밖 근무자를 넣으면 400 — 정상 검증이므로
    // 사용자에게 무엇을 해야 하는지 알려준다. 그 외 서버 메시지는 그대로 노출.
    let message = '근무 그룹 저장에 실패했습니다'
    try {
      const envelope = (await res.json()) as { message?: unknown }
      const serverMessage = typeof envelope.message === 'string' ? envelope.message : ''
      if (serverMessage.includes('경호풀')) {
        message = '경호계획서 정보에 등록되지 않은 근무자입니다. 먼저 경호계획서 정보에서 근무자를 추가해 주세요.'
      } else if (serverMessage) {
        message = serverMessage
      }
    } catch {
      // 응답 파싱 실패 시 기본 메시지 유지
    }
    throw new Error(message)
  }
}

// 근무조 삭제 — DELETE DeleteScheduleGroup?groupSeq=&caseSeq=. 그룹1(첫 조)은
// 삭제할 수 없다(호출부 ScheduleGroupDialog에서 버튼 자체를 숨김).
export async function deleteScheduleGroup(id: string, groupSeq: string): Promise<void> {
  const res = await apiFetch(
    `/v1/GuardCase/Stec/W/DeleteScheduleGroup?groupSeq=${Number(groupSeq)}&caseSeq=${toSeq(id)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    throw new Error('근무 그룹 삭제에 실패했습니다')
  }
}

// 사전미팅 저장/수정/삭제 — PUT SaveCaseMeeting.
// preMeeting이 null이거나 참석 근무자가 없으면 삭제(hasMeeting:false). 아니면
// 미팅 전체 1구간(startTime~endTime) + guardSeqs로 보낸다.
export async function setPreMeeting(id: string, preMeeting: PreMeeting | null): Promise<void> {
  let body: Record<string, unknown>
  if (!preMeeting || preMeeting.workerIds.length === 0) {
    body = {
      caseSeq: toSeq(id),
      hasMeeting: false,
      meetingStart: null,
      meetingEnd: null,
      guardSeqs: [],
    }
  } else {
    body = {
      caseSeq: toSeq(id),
      hasMeeting: true,
      meetingStart: `${preMeeting.date}T${preMeeting.startTime}:00`,
      meetingEnd: `${preMeeting.date}T${preMeeting.endTime}:00`,
      guardSeqs: preMeeting.workerIds.map((workerId) => Number(workerId)),
    }
  }
  await sendJson(
    '/v1/GuardCase/Stec/W/SaveCaseMeeting',
    'PUT',
    body,
    '사전미팅 저장에 실패했습니다',
  )
}

// ─── 첨부 파일 업로드/다운로드 ──────────────────────────────────────────────
// PatchGuardPlanDoc / PatchConsentDoc / PatchDestroyDoc — 전부 multipart/form-data.
// 서버가 파일 시그니처(매직바이트)를 검사한다("File signature is not allowed" 400).
// 파기확인서는 경호중·경호완료 상태에서만 등록 가능(그 외 409).

async function uploadDoc(
  endpoint: string,
  fields: Record<string, string | number>,
  file: File,
): Promise<void> {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v))
  form.append('file', file)
  // Content-Type은 브라우저가 boundary와 함께 자동 지정 — 직접 넣지 않는다.
  const res = await apiFetch(`/v1/GuardCase/Stec/W/${endpoint}`, { method: 'PUT', body: form })
  if (!res.ok) {
    let message = '파일 업로드에 실패했습니다'
    try {
      const envelope = (await res.json()) as { message?: unknown }
      if (typeof envelope.message === 'string' && envelope.message) {
        message = envelope.message.includes('File signature')
          ? '허용되지 않는 파일 형식입니다. PDF 또는 이미지 파일을 올려주세요.'
          : envelope.message
      }
    } catch {
      // 응답 파싱 실패 시 기본 메시지 유지
    }
    throw new Error(message)
  }
}

export async function uploadSecurityPlanDoc(id: string, file: File): Promise<void> {
  await uploadDoc('PatchGuardPlanDoc', { caseSeq: toSeq(id) }, file)
}

export async function uploadWorkerConsentDoc(
  id: string,
  workerId: string,
  file: File,
): Promise<void> {
  await uploadDoc('PatchConsentDoc', { caseSeq: toSeq(id), guardSeq: Number(workerId) }, file)
}

export async function uploadDestructionCertDoc(id: string, file: File): Promise<void> {
  await uploadDoc('PatchDestroyDoc', { caseSeq: toSeq(id) }, file)
}

// 파기확인서 다운로드 — GET GetDestroyDocDownload?caseSeq=. 응답은 바이너리 +
// Content-Disposition. Authorization 헤더가 필요해 <a href>로는 못 받으므로
// blob으로 받아 클라이언트에서 저장 트리거한다.
export async function downloadDestructionCert(id: string): Promise<void> {
  const res = await apiFetch(
    `/v1/GuardCase/Stec/W/GetDestroyDocDownload?caseSeq=${toSeq(id)}`,
  )
  if (!res.ok) {
    throw new Error('파기확인서를 불러오지 못했습니다')
  }
  const blob = await res.blob()
  const disposition = res.headers.get('content-disposition') ?? ''
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  const fileName = match ? decodeURIComponent(match[1]) : `파기확인서_${id}.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
