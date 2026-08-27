import { apiFetch } from '../../auth/api/client'
import type { SecurityCase } from '../types/securityCase'

// 화면 1h/2h/8: 이력 조회 목록 — 서버(mock)가 종결/취소 건만, 조직 계층별 스코프로
// 필터링해서 내려준다.
export async function listSecurityCaseHistory(): Promise<SecurityCase[]> {
  const res = await apiFetch('/security-cases/history')
  if (!res.ok) {
    throw new Error('이력 조회 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<SecurityCase[]>
}

// 화면 8h: 이력 상세
export async function getSecurityCaseHistoryDetail(id: string): Promise<SecurityCase> {
  const res = await apiFetch(`/security-cases/history/${id}`)
  if (!res.ok) {
    throw new Error('이력 상세를 불러오지 못했습니다')
  }
  return res.json() as Promise<SecurityCase>
}
