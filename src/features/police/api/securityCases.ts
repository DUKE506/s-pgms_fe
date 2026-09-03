import { apiFetch } from '../../auth/api/client'
import { useAuthStore } from '../../auth/store/authStore'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { splitMgmtNo } from '@/shared/lib/managementNumber'
import { genderLabelToCode } from '@/shared/lib/subject'
import type {
  SecurityCase,
  SecurityCaseCreateInput,
  SecurityCaseStatus,
} from '../types/securityCase'

// 화면3: 접수/배치요구서 작성 → POST Deploy/Police/W/AddDeployRequest.
// SecurityCaseCreateInput(폼 구조) → AddDeployRequestDto(서버 구조)로 매핑한다.
// groupSeq는 로그인 시 GetMyProfile로 받아 세션에 저장한 값(GetDeployList와 동일).
//
// ⚠️ D-2(2026-09-02): 실제 API는 배치장소가 deploymentPlace 단일 필드인데 폼은
// 주거지/직장지/기타1/기타2 4필드다. 백엔드에 4필드 확장을 요청해둔 상태
// (docs/backend-integration-issues.md #5)라, 확장 전까지는 주거지만 전송하고
// 나머지 3개는 임시 제외한다(docs/backend-integration-exclusions.md).
export async function createSecurityCase(input: SecurityCaseCreateInput): Promise<void> {
  const groupSeq = useAuthStore.getState().user?.groupSeq

  const body = {
    groupSeq,
    suspectName: input.subject.nameInitial,
    suspectGender: genderLabelToCode(input.subject.gender),
    suspectBirthDate: input.subject.birthDate,
    suspectJob: input.subject.occupation,
    suspectAddress: input.subject.residence,
    crimeType: input.caseType,
    caseSummary: input.caseSummary,
    deploymentPeriodFrom: input.startDate,
    deploymentPeriodTo: input.endDate,
    deploymentPlace: input.location.residence, // D-2: 주거지만 (위 주석 참고)
    caseMemo: input.additionalNotes,
    documentDt: new Date().toISOString().slice(0, 10),
    clientDept: input.requester.dept,
    clientPosition: input.requester.position,
    clientName: input.requester.name,
    investigator: input.policeContact.investigator,
    responsibleOfficer: input.policeContact.victimOfficer,
  }

  const res = await apiFetch('/v1/Deploy/Police/W/AddDeployRequest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error('배치요구서 등록에 실패했습니다')
  }
}

// GET /api/v1/Deploy/Police/W/GetDeployList 의 항목 형태
// (docs/backend-integration-responses/Deploy-Police-GetDeployList.md 실측).
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
  return {
    id: String(row.deploySeq),
    receiptNumber,
    securityCode,
    policeStation: '',
    jurisdiction: '',
    status: row.statusName as SecurityCaseStatus,
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

// 게스트 계정 관리(화면 6, 아직 mock) 전용 — 발급 가능한 경호건의 id·경호코드
// 목록만 필요하다. 실제 연동(matrix 6번) 전까지 mock 엔드포인트를 그대로 쓴다.
// 경찰서 경호목록(listSecurityCases)과 응답 형태가 달라 캐시 키도 분리한다.
export async function listGuestScopeSecurityCases(): Promise<SecurityCase[]> {
  const res = await apiFetch('/security-cases')
  if (!res.ok) {
    throw new Error('경호목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<SecurityCase[]>
}

// 화면5: 배치요구서 수정 — 접수/배정은 배치기간 포함 전체, 경호중 이후는
// 화면단에서 배치기간 입력을 막아둔 채로 그대로 전송한다.
export async function updateSecurityCase(
  id: string,
  input: SecurityCaseCreateInput,
): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    throw new Error('배치요구서 수정에 실패했습니다')
  }
  return res.json() as Promise<SecurityCase>
}
