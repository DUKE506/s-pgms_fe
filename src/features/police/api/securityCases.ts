import { apiFetch } from '../../auth/api/client'
import type { SecurityCase, SecurityCaseCreateInput } from '../types/securityCase'

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

// 화면 3: 자기 경찰서 소속 건만 서버(mock)에서 필터링되어 내려온다.
export async function listSecurityCases(): Promise<SecurityCase[]> {
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
