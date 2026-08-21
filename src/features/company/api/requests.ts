import { apiFetch } from '../../auth/api/client'
import type { SecurityCase } from '../../police/types/securityCase'

export async function listPendingRequests(): Promise<SecurityCase[]> {
  const res = await apiFetch(`/security-cases?${new URLSearchParams({ status: '접수' })}`)
  if (!res.ok) {
    throw new Error('배치요청 목록을 불러오지 못했습니다')
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
