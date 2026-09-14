import { apiFetch } from '../../auth/api/client'
import { useAuthStore } from '../../auth/store/authStore'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { splitMgmtNo } from '@/shared/lib/managementNumber'
import { genderLabelToCode } from '@/shared/lib/subject'
import { caseTypeToCrimeCode } from '@/shared/lib/crimeType'
import { resolveDeployStatus } from '@/shared/lib/deployStatus'
import { toSeq } from './securityCaseDetail'
import type { SecurityCase, SecurityCaseCreateInput } from '../types/securityCase'

// SecurityCaseCreateInput(폼 구조) → Add/UpdateDeployRequestDto 공통 필드.
// 신규접수(AddDeployRequest)와 배치요구서 수정(UpdateDeployRequest)이 대칭 DTO라
// 매핑을 공유한다. 배치장소는 서버가 guardHomeLoc/guardWorkLoc/guardEtcLoc1/
// guardEtcLoc2 4필드를 받는다(2026-09-03 백엔드 수정 반영 — 이전엔 deploymentPlace
// 단일 필드로 알고 주거지만 보내던 D-2 임시처리였음). 빈 문자열은 null로 보낸다.
// 사건유형은 서버 enum 코드(stalking 등)로 보낸다 — DEPLOY_REQUEST.CRIME_TYPE이
// 코드 컬럼이라(shared/lib/crimeType.ts).
function toDeployRequestDto(input: SecurityCaseCreateInput) {
  return {
    suspectName: input.subject.nameInitial,
    suspectGender: genderLabelToCode(input.subject.gender),
    suspectBirthDate: input.subject.birthDate,
    suspectJob: input.subject.occupation,
    suspectAddress: input.subject.residence,
    crimeType: caseTypeToCrimeCode(input.caseType),
    caseSummary: input.caseSummary,
    deploymentPeriodFrom: input.startDate,
    deploymentPeriodTo: input.endDate,
    guardHomeLoc: input.location.residence || null,
    guardWorkLoc: input.location.workplace || null,
    guardEtcLoc1: input.location.etc1 || null,
    guardEtcLoc2: input.location.etc2 || null,
    caseMemo: input.additionalNotes,
    documentDt: new Date().toISOString().slice(0, 10),
    clientDept: input.requester.dept,
    clientPosition: input.requester.position,
    clientName: input.requester.name,
    investigator: input.policeContact.investigator,
    responsibleOfficer: input.policeContact.victimOfficer,
  }
}

// 화면3: 접수/배치요구서 작성 → POST Deploy/Police/W/AddDeployRequest.
// groupSeq는 로그인 시 GetMyProfile로 받아 세션에 저장한 값(GetDeployList와 동일).
export async function createSecurityCase(input: SecurityCaseCreateInput): Promise<void> {
  const groupSeq = useAuthStore.getState().user?.groupSeq

  const res = await apiFetch('/v1/Deploy/Police/W/AddDeployRequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupSeq, ...toDeployRequestDto(input) }),
  })

  if (!res.ok) {
    throw new Error('배치요구서 등록에 실패했습니다')
  }
}

// GET /api/v1/Deploy/Police/W/GetDeployList 의 항목 형태
// (docs/backend-integration/responses/Deploy-Police-GetDeployList.md 실측).
interface DeployListRow {
  deploySeq: number
  caseSeq: number | null
  mgmtNo: string
  suspectUserName: string
  statusName: string
  startDt: string
  endDt: string
  extendCount: number
  remainDays: number
}

// splitMgmtNo(관리번호 완성형 분리)는 상세 연동과 공유하므로 shared/lib로 옮겼다.

// 경찰서 경호목록은 이 목록 응답만 쓰므로, 화면이 읽는 필드(관리번호·대상자·
// 상태·경호기간)만 채우고 나머지 SecurityCase 필드는 빈 값으로 둔다. 상세/수정
// 화면은 별도 API(GetDeployDetail 등, 후속 iteration)로 각자 채운다.
function toSecurityCase(row: DeployListRow): SecurityCase {
  const { receiptNumber, securityCode } = splitMgmtNo(row.mgmtNo)
  // 연장/단축 신청 대기 건은 statusName이 "연장"/"단축"으로 온다 — 경호중으로 정규화하지
  // 않으면 VISIBLE_STATUSES 필터에 걸려 목록에서 사라진다(findings #19).
  const { status, pendingRequestType } = resolveDeployStatus(row.statusName)
  return {
    id: String(row.deploySeq),
    receiptNumber,
    securityCode,
    policeStation: '',
    jurisdiction: '',
    status,
    // 목록 응답엔 요청 종료일/요청일이 없어 타입만 표시용으로 담는다(상세는 GetDeployDetail).
    ...(pendingRequestType
      ? { pendingPeriodRequest: { type: pendingRequestType, requestedEndDate: '', requestedAt: '' } }
      : {}),
    caseType: '사건미접수',
    subject: {
      nameInitial: row.suspectUserName,
      gender: '',
      birthDate: '',
      occupation: '',
      residence: '',
    },
    caseSummary: '',
    startDate: row.startDt,
    endDate: row.endDt,
    remainDays: row.remainDays,
    location: { residence: '', workplace: '', etc1: '', etc2: '' },
    additionalNotes: '',
    policeContact: { victimOfficer: '', investigator: '' },
    requester: { dept: '', position: '', name: '' },
    createdAt: '',
  }
}

// 화면 2: 경찰서 경호목록. 서버가 로그인 계정의 소속 경찰서(groupSeq) 기준으로
// 필터링하며, 권한 밖 groupSeq는 403으로 막는다. groupSeq는 로그인 시점에
// GetMyProfile로 받아 세션에 저장해둔 값을 그대로 넘긴다.
export async function listSecurityCases(): Promise<SecurityCase[]> {
  const groupSeq = useAuthStore.getState().user?.groupSeq
  const query = groupSeq != null ? `?groupSeq=${groupSeq}` : ''
  const res = await apiFetch(`/v1/Deploy/Police/W/GetDeployList${query}`)
  if (!res.ok) {
    throw new Error('경호목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<DeployListRow[]>(res)
  return rows.map(toSecurityCase)
}

// 화면5: 배치요구서 수정 → PUT Deploy/Police/W/UpdateDeployRequest.
// AddDeployRequest와 대칭 DTO + deployReqSeq. 접수/배정은 배치기간 포함 전체 수정,
// 경호중 이후는 화면단에서 배치기간 입력을 막고(스웨거 설명상 서버도 배정 후 배치기간
// 무시) 그대로 전송한다. 성공 응답은 {data:true}뿐 — 호출부는 상세로 이동만 한다.
export async function updateSecurityCase(
  id: string,
  input: SecurityCaseCreateInput,
): Promise<void> {
  const res = await apiFetch('/v1/Deploy/Police/W/UpdateDeployRequest', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deployReqSeq: toSeq(id), ...toDeployRequestDto(input) }),
  })
  if (!res.ok) {
    throw new Error('배치요구서 수정에 실패했습니다')
  }
}
