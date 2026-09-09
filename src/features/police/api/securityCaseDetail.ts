import { apiFetch } from '../../auth/api/client'
import { useAuthStore } from '../../auth/store/authStore'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { splitMgmtNo } from '@/shared/lib/managementNumber'
import { genderCodeToLabel } from '@/shared/lib/subject'
import { hhmm, parseMeasureItems, parseMeasurePeriod } from '@/shared/lib/caseMeasures'
import type {
  CaseBaseInfo,
  CaseType,
  ClosureReason,
  SecurityCase,
  SecurityCaseStatus,
} from '../types/securityCase'

// 화면4: [경찰서] 피전 · 경호 상세 — 백엔드 연동(matrix 4번).
//
// 조회는 GET Deploy/Police/W/GetDeployDetail
// (docs/backend-integration/responses/Deploy-Police-GetDeployDetail.md 실측).
// 접수 상태 조회는 검증 완료. 2026-09-07 백엔드가 배정+경호계획 등록 건에 대해
// summary1~5(조치 5개)·startTime/endTime(근무시간 명시 필드)·guardUserList(대표근무자
// 이름)를 응답에 추가 — 이제 본사 GetGuardCaseDetail과 같은 구조다. 그 필드로 baseInfo를
// 조립해 통합 기본정보 카드(CaseBaseInfoCard)의 조치·배치시간을 채운다(issues #13 해소).
// 배정 이후 상태(경호취소/연장·단축/종결)는 matrix 9번 이후 재검증.

// GetDeployDetail 응답 data 형태.
interface DeployDetailData {
  deployReqSeq: number
  mgmtNo: string
  statusName: string
  suspectUserName: string | null
  // startDate/endDate/startTime/endTime = 경호계획의 근무일자·근무시간(미등록이면 전부 null).
  // 경호기간(일자)은 periodFrom/periodTo로 항상 온다.
  startDate: string | null
  endDate: string | null
  startTime: string | null
  endTime: string | null
  periodFrom: string | null
  periodTo: string | null
  requestedEndDate: string | null
  clientName: string | null
  clientDept: string | null
  clientPosition: string | null
  suspectAddress: string | null
  guardHomeLoc: string | null
  guardWorkLoc: string | null
  guardEtcLoc1: string | null
  guardEtcLoc2: string | null
  investigator: string | null
  responsibleOfficer: string | null
  crimeType: string | null
  extendCount: number
  // 조치 5개 — 경호계획 등록 후에만 채워진다(미등록이면 전부 null). 본사
  // GetGuardCaseDetail과 같은 손실 매핑 포맷(항목 ", " / 기간 " ~ ").
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
  // 대표근무자 — 이름뿐(guardSeq 없음). 피전은 근무자 마스터 접근 권한이 없어
  // (issues #6) 카드에 근무자를 그리지 않으므로 지금은 소비하지 않는다.
  guardUserList?: { guardName: string }[]

  // 테스트 더블(mocks/handlers/deploy.ts)만 채우는 필드 — 실제 응답엔 없다.
  // 배정 이후 상태(baseInfo/schedule/attachments/pending·closure·cancel)까지
  // 갖춘 화면 회귀를 vitest에서 오프라인으로 검증하려고 mock 레코드 전체를
  // 실어 보낸다.
  mock?: SecurityCase
}

// 경호계획 등록 건: summary1~5 + startTime/endTime으로 조치·근무시간을 조립한다.
// 배치장소/수사관은 GetDeployDetail의 flat 필드에서 온다. defaultWorkers는 피전
// 응답에 배정 근무자 목록/id가 없어(guardUserList는 이름뿐) 빈 배열 — 통합 카드가
// 근무자를 그리지 않으므로 표시에 영향 없다.
function toBaseInfo(d: DeployDetailData): CaseBaseInfo {
  return {
    workHours: `${hhmm(d.startTime)} ~ ${hhmm(d.endTime)}`,
    defaultWorkers: [],
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

// GetDeployDetail 실제 응답 → SecurityCase. id는 호출부가 넘긴 값을 그대로
// 되돌린다(실제 백엔드에선 곧 String(deployReqSeq)이고, 라우트 파라미터·쿼리
// 키·수정 링크가 전부 이 값을 공유한다).
function toSecurityCase(id: string, d: DeployDetailData): SecurityCase {
  const split = splitMgmtNo(d.mgmtNo)
  const groupName = useAuthStore.getState().user?.groupName ?? ''

  return {
    id,
    receiptNumber: split.receiptNumber,
    securityCode: split.securityCode,
    // 목록 연동과 동일하게, 응답에 소속 정보가 없으면 세션 groupName으로 대체.
    policeStation: groupName,
    jurisdiction: '',
    status: d.statusName as SecurityCaseStatus,
    caseType: (d.crimeType as CaseType) || '사건미접수',
    subject: {
      nameInitial: d.suspectUserName ?? '',
      // 성별/생년월일/직업은 GetDeployDetail이 주지 않는다(수정 화면 #5에서
      // 별도 확인 — docs/backend-integration/findings.md).
      gender: '',
      birthDate: '',
      occupation: '',
      residence: d.suspectAddress ?? '',
    },
    // caseSummary(사건개요)/additionalNotes(참고사항)도 응답에 없다 — 경찰 상세
    // 화면은 원래 이 둘을 표시하지 않으므로 영향 없음(수정 화면 #5에서 확인).
    caseSummary: '',
    startDate: d.periodFrom ?? d.startDate ?? '',
    endDate: d.periodTo ?? d.endDate ?? '',
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
    requester: {
      dept: d.clientDept ?? '',
      position: d.clientPosition ?? '',
      name: d.clientName ?? '',
    },
    createdAt: '',
    // 경호계획 등록 건(startDate 있음)만 조치·근무시간을 조립한다. 미등록/접수 상태는
    // baseInfo 없이 통합 카드가 "-"로 렌더(기존 동작 불변). 본사 getSecurityCase의
    // planRegistered 판정(detail.startDate != null)과 같은 신호.
    baseInfo: d.startDate != null ? toBaseInfo(d) : undefined,
  }
}

// 실제 백엔드는 deployReqSeq를 정수로 받는다. vitest 테스트 더블은 mock 레코드의
// 문자열 id(예: 'case-seed-1')를 그대로 넘겨야 매칭되므로, 숫자 문자열일 때만
// 정수로 바꾸고 그 외엔 원본 문자열을 넘긴다.
export function toSeq(id: string): number | string {
  return /^\d+$/.test(id) ? Number(id) : id
}

export async function getSecurityCase(id: string): Promise<SecurityCase> {
  const res = await apiFetch(
    `/v1/Deploy/Police/W/GetDeployDetail?deployReqSeq=${encodeURIComponent(id)}`,
  )
  if (!res.ok) {
    throw new Error('경호건을 불러오지 못했습니다')
  }
  const d = await unwrapEnvelope<DeployDetailData>(res)
  const mapped = toSecurityCase(id, d)
  // d.mock은 테스트 더블에서만 온다(위 DeployDetailData 주석 참고).
  return d.mock ? { ...mapped, ...d.mock, id } : mapped
}

// 화면5: [경찰서] 피전 · 배치요구서 수정 — prefill 소스.
// GET Deploy/Police/W/GetDeployDetailUpdate?deployReqSeq= (2026-09-03 실측).
// GetDeployDetail(상세페이지용 "기본정보" 뷰)과 달리 배치요구서 원본 필드를 전부
// 준다 — 성별/생년월일/직업/사건개요/참고사항/배치장소 4필드. 배정 이후 상태에서도
// 200(deployStatus로 구분). 응답에 mgmtNo는 없다(수정 화면 breadcrumb은 그 없이 표시).
// 필드명 주의: 읽기 응답은 suspectBirth/etcLoc1/etcLoc2/deployStatus, 쓰기 DTO는
// suspectBirthDate/guardEtcLoc1/guardEtcLoc2.
interface DeployDetailUpdateData {
  deployReqSeq: number
  deployStatus: string
  crimeType: string | null
  suspectUserName: string | null
  suspectGender: number | null
  suspectBirth: string | null
  suspectJob: string | null
  suspectAddress: string | null
  caseSummary: string | null
  periodFrom: string | null
  periodTo: string | null
  requestedEndDate: string | null
  guardWorkLoc: string | null
  guardHomeLoc: string | null
  etcLoc1: string | null
  etcLoc2: string | null
  caseMemo: string | null
  documentDt: string | null
  clientDept: string | null
  clientPosition: string | null
  clientName: string | null
  investigator: string | null
  responsibleOfficer: string | null

  // 테스트 더블만 채우는 필드 — getSecurityCase의 mock과 같은 처리.
  mock?: SecurityCase
}

function toSecurityCaseFromEdit(id: string, d: DeployDetailUpdateData): SecurityCase {
  return {
    id,
    // GetDeployDetailUpdate 응답엔 mgmtNo가 없다. 수정 화면 breadcrumb만 쓰던 값이라
    // 빈 값으로 두고 화면 쪽에서 처리한다.
    receiptNumber: '',
    policeStation: useAuthStore.getState().user?.groupName ?? '',
    jurisdiction: '',
    status: d.deployStatus as SecurityCaseStatus,
    caseType: (d.crimeType as CaseType) || '사건미접수',
    subject: {
      nameInitial: d.suspectUserName ?? '',
      gender: d.suspectGender != null ? genderCodeToLabel(d.suspectGender) : '',
      birthDate: d.suspectBirth ?? '',
      occupation: d.suspectJob ?? '',
      residence: d.suspectAddress ?? '',
    },
    caseSummary: d.caseSummary ?? '',
    startDate: d.periodFrom ?? '',
    endDate: d.periodTo ?? '',
    location: {
      residence: d.guardHomeLoc ?? '',
      workplace: d.guardWorkLoc ?? '',
      etc1: d.etcLoc1 ?? '',
      etc2: d.etcLoc2 ?? '',
    },
    additionalNotes: d.caseMemo ?? '',
    policeContact: {
      victimOfficer: d.responsibleOfficer ?? '',
      investigator: d.investigator ?? '',
    },
    requester: {
      dept: d.clientDept ?? '',
      position: d.clientPosition ?? '',
      name: d.clientName ?? '',
    },
    createdAt: d.documentDt ?? '',
  }
}

export async function getDeployRequestForEdit(id: string): Promise<SecurityCase> {
  const res = await apiFetch(
    `/v1/Deploy/Police/W/GetDeployDetailUpdate?deployReqSeq=${encodeURIComponent(id)}`,
  )
  if (!res.ok) {
    throw new Error('배치요구서를 불러오지 못했습니다')
  }
  const d = await unwrapEnvelope<DeployDetailUpdateData>(res)
  const mapped = toSecurityCaseFromEdit(id, d)
  return d.mock ? { ...mapped, ...d.mock, id } : mapped
}

// 접수취소 + 경호취소 공용 엔드포인트: POST Deploy/Police/W/CancelGuardCase.
// 접수 단계는 DB에서 완전 삭제(성공 응답 {data:true}), 배정 이후는 '취소' 상태
// 전환 — 후자는 matrix 12번 이후 재검증. reason은 스키마상 선택(nullable).
async function cancelGuardCase(id: string, reason?: string): Promise<void> {
  const body: Record<string, unknown> = { deployReqSeq: toSeq(id) }
  if (reason) {
    body.reason = reason
  }
  const res = await apiFetch('/v1/Deploy/Police/W/CancelGuardCase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error('취소 처리에 실패했습니다')
  }
}

// 접수취소: 사유 없이 확인만 받고 삭제(CancelPendingCaseDialog). 성공 응답은
// {data:true}뿐이라 갱신된 케이스를 못 준다 — 호출부는 성공 후 목록으로 이동만 함.
export async function cancelPendingCase(id: string): Promise<void> {
  await cancelGuardCase(id)
}

// 경호취소: 배정 이후 사유와 함께 '취소' 상태로 전환(CancelAssignedCaseDialog).
// 반환값(구 SecurityCase)을 쓰던 곳이 없어 void로 바꿨다. matrix 12번 이후
// 배정 데이터로 재검증하고, 필요하면 성공 후 재조회로 전환한다.
export async function cancelAssignedCase(id: string, reason: string): Promise<void> {
  await cancelGuardCase(id, reason)
}

// 연장/단축 요청: PATCH Deploy/Police/W/ExtendDeployPeriod | ShortenDeployPeriod
// {deployReqSeq, afterEndDate}. 경호중 상태에서만 열리는 화면이라 matrix 12번
// (배정→경호중 데이터 생성) 이후 재검증.
export async function requestPeriodChange(
  id: string,
  type: '연장' | '단축',
  requestedEndDate: string,
): Promise<void> {
  const endpoint = type === '연장' ? 'ExtendDeployPeriod' : 'ShortenDeployPeriod'
  const res = await apiFetch(`/v1/Deploy/Police/W/${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deployReqSeq: toSeq(id), afterEndDate: requestedEndDate }),
  })
  if (!res.ok) {
    throw new Error('연장/단축 요청에 실패했습니다')
  }
}

// 종결: POST Deploy/Police/W/CloseGuardCase. 실제 DTO는 {caseSeq, endReason}으로
// 종결사유가 자유텍스트 단일 필드다 — 프론트의 ClosureReason(+상세)를 한 문자열로
// 합쳐 보낸다. ⚠️ caseSeq는 GetDeployDetail이 주지 않으므로 배정 이후 상세
// (GetGuardCaseDetail) 연동 전까지는 deployReqSeq를 그대로 넘긴다 — matrix 12번에서
// 재검증/수정(경호완료 상태에서만 열리는 화면이라 지금은 실측 불가).
export async function closeCase(
  id: string,
  closureReason: ClosureReason,
  closureReasonDetail?: string,
): Promise<void> {
  const endReason =
    closureReason === '기타' && closureReasonDetail?.trim()
      ? `${closureReason} - ${closureReasonDetail.trim()}`
      : closureReason
  const res = await apiFetch('/v1/Deploy/Police/W/CloseGuardCase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseSeq: toSeq(id), endReason }),
  })
  if (!res.ok) {
    throw new Error('종결 처리에 실패했습니다')
  }
}
