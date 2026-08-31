import { apiFetch } from './client'
import type { AuthSession } from '../store/authStore'

// 최초 로그인 강제 비밀번호 변경(게스트 발급/관리자 비밀번호 초기화 직후) —
// 로그인 자체는 성공했지만 세션은 발급되지 않은 상태.
export interface MustChangePasswordResult {
  mustChangePassword: true
  id: string
}

async function login(
  endpoint: string,
  id: string,
  password: string,
): Promise<AuthSession | MustChangePasswordResult> {
  const res = await apiFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password }),
  })

  if (!res.ok) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다')
  }

  return res.json() as Promise<AuthSession | MustChangePasswordResult>
}

export function policeLogin(id: string, password: string) {
  return login('/auth/police/login', id, password)
}

export function companyLogin(id: string, password: string) {
  return login('/auth/company/login', id, password)
}

async function changeInitialPassword(
  endpoint: string,
  id: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await apiFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, oldPassword, newPassword }),
  })

  if (!res.ok) {
    throw new Error('비밀번호 변경에 실패했습니다')
  }
}

export function policeChangeInitialPassword(id: string, oldPassword: string, newPassword: string) {
  return changeInitialPassword('/auth/police/change-initial-password', id, oldPassword, newPassword)
}

export function companyChangeInitialPassword(id: string, oldPassword: string, newPassword: string) {
  return changeInitialPassword('/auth/company/change-initial-password', id, oldPassword, newPassword)
}
