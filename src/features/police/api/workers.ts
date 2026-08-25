import { apiFetch } from '../../auth/api/client'
import type { Worker } from '../../company/api/workers'

// 화면 5: 근무자 배정 패널이 이름/전화번호 조회용으로만 읽는다 — 등록은 본사 전용.
export async function listWorkers(): Promise<Worker[]> {
  const res = await apiFetch('/workers')
  if (!res.ok) {
    throw new Error('근무자 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<Worker[]>
}
