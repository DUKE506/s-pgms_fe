import { apiFetch } from '../../auth/api/client'
import type { SecurityCase } from '../types/securityCase'

async function unwrap(res: Response, errorMessage: string): Promise<SecurityCase> {
  if (!res.ok) {
    throw new Error(errorMessage)
  }
  return res.json() as Promise<SecurityCase>
}

export async function getSecurityCase(id: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}`)
  return unwrap(res, '경호건을 불러오지 못했습니다')
}

// 접수취소: 상태값 없이 삭제되므로 반환값이 없다.
export async function cancelPendingCase(id: string): Promise<void> {
  const res = await apiFetch(`/security-cases/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('접수취소에 실패했습니다')
  }
}

export async function cancelAssignedCase(id: string, reason: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  return unwrap(res, '경호취소에 실패했습니다')
}

export async function requestPeriodChange(
  id: string,
  type: '연장' | '단축',
  requestedEndDate: string,
): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/period-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, requestedEndDate }),
  })
  return unwrap(res, '연장/단축 요청에 실패했습니다')
}

export async function closeCase(id: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/${id}/close`, { method: 'PUT' })
  return unwrap(res, '종결 처리에 실패했습니다')
}
