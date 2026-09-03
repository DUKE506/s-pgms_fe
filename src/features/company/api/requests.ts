import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import type { SecurityCase } from '../../police/types/securityCase'

// GET /api/v1/GuardCase/Stec/W/GetDeployRequestList 의 항목 형태
// (docs/backend-integration-responses/GuardCase-Stec-GetDeployRequestList.md 실측).
interface DeployRequestRow {
  deploySeq: number
  caseSeq: number | null
  mgmtNo: string
  groupName: string
  parentGroupName: string
  createDt: string
  periodFrom: string
  periodTo: string
  requestedEndDate: string | null
}

// 배치요청 목록은 미배정(caseSeq: null) 배치요구서만 담는다 — 화면이 읽는 필드
// (관리번호·경찰서·지역청·요청일·배치기간)만 채우고 나머지 SecurityCase 필드는 빈
// 값으로 둔다. mgmtNo는 접미사·경호코드 없는 "26-09-동래경찰서" 형태라 그대로 쓴다.
// 대상자·배치요구서 상세는 이 응답에 없다 — 본사가 배치요구서 원본을 볼 API 자체가
// 없어(issues.md #7) DispatchRequestViewDialog는 목록 필드만 보여준다.
function toSecurityCase(row: DeployRequestRow): SecurityCase {
  return {
    id: String(row.deploySeq),
    receiptNumber: row.mgmtNo,
    policeStation: row.groupName,
    jurisdiction: row.parentGroupName,
    status: '접수',
    caseType: '사건미접수',
    subject: { nameInitial: '', gender: '', birthDate: '', occupation: '', residence: '' },
    caseSummary: '',
    startDate: row.periodFrom,
    endDate: row.periodTo,
    location: { residence: '', workplace: '', etc1: '', etc2: '' },
    additionalNotes: '',
    policeContact: { victimOfficer: '', investigator: '' },
    requester: { dept: '', position: '', name: '' },
    createdAt: row.createDt,
  }
}

// 화면: [본사] 배치요청 목록. 운영/시스템관리자는 전국 모든 미배정 배치요청을 본다
// (스코프 필터 없음 — 서버가 파라미터 없이도 전량 반환). 본부관리자는 403.
export async function listPendingRequests(): Promise<SecurityCase[]> {
  const res = await apiFetch('/v1/GuardCase/Stec/W/GetDeployRequestList')
  if (!res.ok) {
    throw new Error('배치요청 목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<DeployRequestRow[]>(res)
  return rows.map(toSecurityCase)
}

// 화면 6d: 상태 무관 전체 경호건 목록 (담당자 배정 후 확인/추적용)
export async function listSecurityCases(): Promise<SecurityCase[]> {
  const res = await apiFetch('/security-cases')
  if (!res.ok) {
    throw new Error('경호목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<SecurityCase[]>
}

// 본부 배정 — POST GuardCase/Stec/W/AddGuardCase {deploySeq, userSeq}.
// 여기서 GuardCase(경호건)가 처음 생성된다. 성공 응답은 {data:true}뿐이라 호출부는
// 목록을 재조회해 확인한다(반환값 없음). caseId=SecurityCase.id=deploySeq(문자열),
// managerId=Manager.id=userSeq(문자열).
export async function assignManager(caseId: string, managerId: string): Promise<void> {
  const res = await apiFetch('/v1/GuardCase/Stec/W/AddGuardCase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deploySeq: Number(caseId), userSeq: Number(managerId) }),
  })
  if (!res.ok) {
    throw new Error('담당자 배정에 실패했습니다')
  }
}

// ⚠️ 배치요청 "취소" API가 아직 없다 — GuardCase/Stec/W/CancelGuardCase는 스웨거에
// 없고, 유일한 취소 엔드포인트 Deploy/Police/W/CancelGuardCase는 Police 태그라 본사
// 토큰으로 호출 불가(issues.md에 신규 이슈로 기록, 섹션 일괄 요청 대상). 반영 전까지
// RequestListPage의 "취소" 메뉴는 disabled — 이 함수는 호출되지 않는다.
export async function cancelPendingRequest(caseId: string): Promise<void> {
  const res = await apiFetch(`/security-cases/${caseId}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('배치요청 취소에 실패했습니다')
  }
}

// [본사] 연장요청/단축요청 목록: 전용 서버 필터 없이 전체 목록을 받아 클라이언트에서
// pendingPeriodRequest.type으로 거른다.
export async function listPeriodRequests(type: '연장' | '단축'): Promise<SecurityCase[]> {
  const cases = await listSecurityCases()
  return cases.filter((c) => c.pendingPeriodRequest?.type === type)
}

export async function approvePeriodRequest(caseId: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${caseId}/period-request/approve`, {
    method: 'PUT',
  })
  if (!res.ok) {
    throw new Error('승인에 실패했습니다')
  }
  return res.json() as Promise<SecurityCase>
}

export async function rejectPeriodRequest(caseId: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${caseId}/period-request/reject`, {
    method: 'PUT',
  })
  if (!res.ok) {
    throw new Error('거부에 실패했습니다')
  }
  return res.json() as Promise<SecurityCase>
}
