import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'

export interface Manager {
  id: string
  name: string
  // 소속 본부 — 실제 GetStecUserList 응답엔 없다(groupName도 null). issues.md #1
  // (본부 소속 구조화 저장 없음) 반영 전까지 항상 undefined.
  branch?: string
  // 담당 배정 건수 — 실제 응답에 없고 집계 API도 없어 undefined. 화면에서 배지 생략.
  assignedCount?: number
}

// GET /api/v1/User/Stec/W/GetStecUserList 의 항목 형태
// (docs/backend-integration-responses/User-Stec-GetStecUserList.md 실측).
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

// 본사 경호목록(matrix 8번, 아직 mock)이 담당자 id→이름/본부 조인에 쓴다. listManagers를
// 실 API(GetStecUserList)로 바꾸면 mock assigneeId('hqmanager*')와 id 체계가 안 맞아
// 조인이 깨지므로 별도 mock 함수 + 별도 쿼리키로 분리한다 — 8번 연동에서 GetGuardCaseList의
// 담당자 정보로 대체될 때까지 유지(2번 GuestListPage·6번 listCaseJoinWorkers와 같은 처리).
export async function listCaseAssignees(): Promise<Manager[]> {
  const res = await apiFetch('/managers')
  if (!res.ok) {
    throw new Error('담당자 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<Manager[]>
}
