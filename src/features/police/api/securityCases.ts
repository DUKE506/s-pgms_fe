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
