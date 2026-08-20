import { apiFetch } from './client'
import type { AuthSession } from '../store/authStore'

async function login(endpoint: string, id: string, password: string): Promise<AuthSession> {
  const res = await apiFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password }),
  })

  if (!res.ok) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다')
  }

  return res.json() as Promise<AuthSession>
}

export function policeLogin(id: string, password: string) {
  return login('/auth/police/login', id, password)
}

export function companyLogin(id: string, password: string) {
  return login('/auth/company/login', id, password)
}
