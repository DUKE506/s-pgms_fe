import { apiFetch } from '../../auth/api/client'
import { useAuthStore } from '../../auth/store/authStore'
import { unwrapEnvelope } from '@/shared/api/envelope'
import type {
  SecurityCase,
  SecurityCaseCreateInput,
  SecurityCaseStatus,
} from '../types/securityCase'

export async function createSecurityCase(input: SecurityCaseCreateInput): Promise<SecurityCase> {
  const res = await apiFetch('/security-cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    throw new Error('배치요구서 등록에 실패했습니다')
  }

  return res.json() as Promise<SecurityCase>
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

// 서버가 관리번호를 이미 조합해서 내려준다("26-08-동래경찰서 접수" / 배정 후엔
// "26-08-동래경찰서 ST123"). 마지막 공백에서 잘라 접수번호와 경호코드 자리로
// 나눈 뒤, 화면은 기존대로 formatManagementNumber로 "접수번호 · 경호코드" 형태로
// 재조합한다(접수 단계는 경호코드 자리에 "접수"가 들어가 "… · 접수"로 표시됨).
function splitMgmtNo(mgmtNo: string): { receiptNumber: string; securityCode?: string } {
  const i = mgmtNo.lastIndexOf(' ')
  if (i === -1) return { receiptNumber: mgmtNo }
  return { receiptNumber: mgmtNo.slice(0, i), securityCode: mgmtNo.slice(i + 1) }
}

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
      birthYear: '',
      age: '',
      occupation: '',
      residence: '',
    },
    caseSummary: '',
    startDate: row.startDt,
    endDate: row.endDt,
    location: { residence: '', workplace: '', etc1: '', etc2: '' },
    additionalNotes: '',
    policeContact: { victimOfficer: '', investigator: '' },
    requester: '',
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
