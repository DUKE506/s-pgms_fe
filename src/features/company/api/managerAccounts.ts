import { apiFetch } from '../../auth/api/client'
import type { Role } from '../../auth/store/authStore'

export interface ManagerAccount {
  id: string
  name: string
  role: Role
  branch?: string
  phone?: string
  // 본부관리자에게만 있음 — 서버가 스코프 무관하게 전체 데이터에서 계산해
  // 내려준다(뷰어가 본부관리자여도 다른 관리자의 실제 배정건수를 볼 수 있어야
  // 하므로, GET /api/security-cases의 본부관리자 스코프 제한과는 무관).
  assignedCount?: number
}

export async function listManagerAccounts(): Promise<ManagerAccount[]> {
  const res = await apiFetch('/company-accounts')
  if (!res.ok) {
    throw new Error('관리자 계정 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<ManagerAccount[]>
}

export async function updateManagerAccountInfo(
  id: string,
  updates: { name: string; phone?: string },
): Promise<ManagerAccount> {
  const res = await apiFetch(`/company-accounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    throw new Error('정보수정에 실패했습니다')
  }
  return res.json() as Promise<ManagerAccount>
}

export async function resetManagerAccountPassword(id: string): Promise<void> {
  const res = await apiFetch(`/company-accounts/${id}/reset-password`, { method: 'POST' })
  if (!res.ok) {
    throw new Error('비밀번호 초기화에 실패했습니다')
  }
}
