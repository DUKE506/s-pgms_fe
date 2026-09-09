import { apiFetch } from '../../auth/api/client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { roleFromCodeSeq } from '../../auth/lib/roleMapping'
import type { Role } from '../../auth/store/authStore'

export interface ManagerAccount {
  // 로그인 아이디 — 화면 "아이디" 열 표시 + 본인 여부 판정(authStore.user.id와 비교).
  id: string
  // 실제 PK(정수) — UpdateUser 호출 대상 식별에 쓴다. 화면엔 노출하지 않는다.
  userSeq: number
  name: string
  role: Role
  // 소속 본부 — GetStecUserList 응답에 없다(groupSeq/groupName 전부 null). issues.md
  // #1(본부 소속 구조화 저장 없음) 반영 전까지 항상 undefined → 화면에서 "-".
  branch?: string
  // 연락처 — 실제 스키마상 "대표번호" 용도(issues.md #1). 값이 있으면 표시/수정한다.
  phone?: string
  // 사용중 여부. 현재 화면엔 상태 열이 없어 표시하지 않지만, 정지/재활성화(useYn)
  // 연동 시 쓰려고 실어둔다.
  useYn: boolean
}

// GET /api/v1/User/Stec/W/GetStecUserList 의 항목 형태
// (docs/backend-integration/responses/User-Stec-GetStecUserList.md 실측).
// managers.ts 의 listManagers 도 같은 응답을 쓴다(거기선 본부관리자만 골라 담당자
// 후보로 사용).
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

// 본부관리자 토큰으로 GetStecUserList 를 부르면 서버가 403 을 준다(운영/시스템관리자
// 전용). 화면이 일반 에러와 구분해 안내 문구를 다르게 보여주려고 별도 타입으로 던진다.
// 본부관리자가 이 화면에 들어와야 하는지(route/메뉴에서 제외 vs 백엔드가 본인 행만
// 반환) 자체는 matrix #12 에서 결정 — 지금은 안내만.
export class ManagerListForbiddenError extends Error {
  constructor() {
    super('관리자 계정 목록 조회 권한이 없습니다')
    this.name = 'ManagerListForbiddenError'
  }
}

// 화면: [본사] 관리자 계정 관리. 운영/시스템관리자는 전체 본사 계정을 조회한다
// (본부관리자는 서버가 403 — matrix 12번 스코프 재검증 대상).
export async function listManagerAccounts(): Promise<ManagerAccount[]> {
  const res = await apiFetch('/v1/User/Stec/W/GetStecUserList')
  if (res.status === 403) {
    throw new ManagerListForbiddenError()
  }
  if (!res.ok) {
    throw new Error('관리자 계정 목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<StecUserRow[]>(res)
  return rows.map((u) => ({
    id: u.loginId,
    userSeq: u.userSeq,
    name: u.userName,
    role: roleFromCodeSeq(u.codeSeq),
    // 빈 문자열도 "없음"으로 취급(백엔드가 빈 값을 "" 로 저장하는 경우가 있다).
    phone: u.phone || undefined,
    useYn: u.useYn,
  }))
}

// 정보수정 — PATCH User/Stec/W/UpdateUser. userSeq 로 대상을 찾고 넘긴 필드만
// 부분 갱신한다. 빈 연락처는 `null` 이 아니라 빈 문자열로 보낸다 — 백엔드가 DTO 의
// `null` 필드는 "변경 안 함"으로 무시하기 때문(실측: null 로는 기존 값이 안 지워짐).
export async function updateManagerAccountInfo(
  userSeq: number,
  updates: { name: string; phone?: string },
): Promise<void> {
  const res = await apiFetch('/v1/User/Stec/W/UpdateUser', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userSeq, name: updates.name, phone: updates.phone ?? '' }),
  })
  if (!res.ok) {
    throw new Error('정보수정에 실패했습니다')
  }
}

// 비밀번호 초기화 — 같은 UpdateUser 엔드포인트. 비밀번호를 아이디와 동일하게
// 재설정하고 pwChangedYn=true 로 두어 다음 로그인에서 강제 변경 모달이 뜨게 한다
// (게스트 계정 발급·최초 로그인 흐름과 같은 방식).
export async function resetManagerAccountPassword(
  userSeq: number,
  loginId: string,
): Promise<void> {
  const res = await apiFetch('/v1/User/Stec/W/UpdateUser', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userSeq, loginPw: loginId, pwChangedYn: true }),
  })
  if (!res.ok) {
    throw new Error('비밀번호 초기화에 실패했습니다')
  }
}
