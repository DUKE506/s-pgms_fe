import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'

export interface Manager {
  id: string
  name: string
  // 담당 배정 건수 — 실제 응답에 없고 집계 API도 없어 undefined. 화면에서 배지 생략.
  assignedCount?: number
}
// ※ "소속 본부"는 담지 않는다(2026-09-09 결정) — 본사 계정은 groupSeq/groupName이
//   항상 null. findings #1 본부 파트 종결.

// GET /api/v1/User/Stec/W/GetStecUserList 의 항목 형태
// (docs/backend-integration/responses/User-Stec-GetStecUserList.md 실측).
interface StecUserRow {
  userSeq: number
  codeSeq: number
  codeName: string
  groupSeq: number | null
  groupName: string | null
  loginId: string
  userName: string
  phone: string | null
  useYn: boolean
  pwChangedYn: boolean
}

// 배치요청 목록의 "담당자 선택" — 전용 엔드포인트가 없어 본사 사용자 전체 목록
// (GetStecUserList)을 받아 본부관리자 + 사용중 계정만 골라 담당자 후보로 쓴다.
export async function listManagers(): Promise<Manager[]> {
  const res = await apiFetch('/v1/User/Stec/W/GetStecUserList')
  if (!res.ok) {
    throw new Error('담당자 목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<StecUserRow[]>(res)
  return rows
    .filter((u) => u.codeName === '본부관리자' && u.useYn)
    .map((u) => ({ id: String(u.userSeq), name: u.userName }))
}
