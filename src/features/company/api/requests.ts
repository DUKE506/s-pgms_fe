import { apiFetch } from '../../auth/api/client'
import type { SecurityCase } from '../../police/types/securityCase'

export async function listPendingRequests(): Promise<SecurityCase[]> {
  const res = await apiFetch(`/security-cases?${new URLSearchParams({ status: '접수' })}`)
  if (!res.ok) {
    throw new Error('배치요청 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<SecurityCase[]>
}

// 화면 6d: 상태 무관 전체 경호건 목록 (담당자 배정 후 확인/추적용)
export async function listSecurityCases(): Promise<SecurityCase[]> {
  const res = await apiFetch('/security-cases')
  if (!res.ok) {
    throw new Error('경호목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<SecurityCase[]>
}

export async function assignManager(caseId: string, managerId: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${caseId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ managerId }),
  })
  if (!res.ok) {
    throw new Error('담당자 배정에 실패했습니다')
  }
  return res.json() as Promise<SecurityCase>
}

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
