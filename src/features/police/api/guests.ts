import { apiFetch } from '../../auth/api/client'
import { useAuthStore } from '../../auth/store/authStore'
import { unwrapEnvelope } from '@/shared/api/envelope'

const GUEST_BASE = '/v1/User/Police/W'

// AddGuestUser.name은 필수(minLength 1)이고 게스트의 표시명(userName)이 된다. 화면엔
// 표시명 입력이 없고(아이디는 서버가 자동 생성) 목록도 loginId만 쓰므로 고정값을
// 보낸다(2026-09-08 사용자 결정). 서버 응답은 발급된 아이디를 돌려주지 않아
// 발급 후 목록을 재조회한다.
const GUEST_DISPLAY_NAME = '게스트'

export interface GuestAccount {
  id: string // loginId — 목록 "아이디" 열 + 검색
  userSeq: number // 상세/수정/삭제 키
  name: string // 표시용(loginId와 동일하게 채움 — 기존 컴포넌트가 name을 아이디로 렌더)
  accessCodes: string[] // 조회권이 부여된 경호건의 경호코드(guardCode) — "조회가능 경호건" 열
  issuedAt: string // createDt
  // 비고 — 어느 부서에서/어떤 협조 목적으로 쓰는 계정인지 표시하는 자유 텍스트
  // (2026-09-14 신규, findings.md 신규 항목). 백엔드 maxLength 1000, nullable.
  memo: string | null
}

// GET GetGuestUserList 행 (실측: docs/backend-integration/responses/User-Police-Guest.md).
// data는 평면 배열(경호목록·이력과 달리 {meta,data} 이중 래핑 아님). 중지된 계정도
// useYn=false로 함께 오지만 이 화면엔 "계정 중지" 기능이 없어(설계상 중지 안 함)
// 걸러낸다 — backend-integration/findings.md 기록, 그룹 D 마무리 시 전달.
interface GuestUserRow {
  userSeq: number
  loginId: string
  userName: string | null
  useYn: boolean
  createDt: string
  accessList: { caseSeq: number; guardCode: string }[] | null
  memo: string | null
}

export async function listGuestAccounts(): Promise<GuestAccount[]> {
  // 피전은 경찰서 선택 UI가 없다 — 로그인 시 GetMyProfile로 받아 세션에 저장한
  // groupSeq를 그대로 넘긴다(GetDeployList·GetHistoryList와 동일).
  const groupSeq = useAuthStore.getState().user?.groupSeq
  const query = groupSeq != null ? `?groupSeq=${groupSeq}` : ''
  const res = await apiFetch(`${GUEST_BASE}/GetGuestUserList${query}`)
  if (!res.ok) {
    throw new Error('게스트 계정 목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<GuestUserRow[]>(res)
  return rows
    .filter((r) => r.useYn !== false)
    .map((r) => ({
      id: r.loginId,
      userSeq: r.userSeq,
      name: r.loginId,
      accessCodes: (r.accessList ?? []).map((a) => a.guardCode).filter(Boolean),
      issuedAt: r.createDt,
      memo: r.memo,
    }))
}

// 발급/수정 다이얼로그의 관리번호 선택 후보. 발급용(GetGuestCaseList)은 isAccess가
// 없고, 수정용(GetGuestCaseDetail)은 같은 후보에 isAccess가 붙는다. 서버가 소속
// 경찰서의 종결·경호취소 안 된 건만 내려준다(클라 필터 불필요).
export interface GuestCaseCandidate {
  caseSeq: number
  mgmtNo: string // "26-09-동래경찰서" — 경호코드 미포함
  guardCode: string // "ST0007"
  isAccess?: boolean // 수정 후보에만
}

interface GuestCaseListRow {
  caseSeq: number
  mgmtNo: string
  guardCode: string
}

export async function listGuestCaseCandidates(): Promise<GuestCaseCandidate[]> {
  const res = await apiFetch(`${GUEST_BASE}/GetGuestCaseList`)
  if (!res.ok) {
    throw new Error('경호건 목록을 불러오지 못했습니다')
  }
  const rows = await unwrapEnvelope<GuestCaseListRow[]>(res)
  return rows.map((r) => ({ caseSeq: r.caseSeq, mgmtNo: r.mgmtNo, guardCode: r.guardCode }))
}

// GetGuestCaseDetail은 관리번호 라벨(mgmtNo)을 안 주고 {caseSeq,guardCode,isAccess}만
// 준다 — 라벨은 호출부에서 GetGuestCaseList 결과와 caseSeq로 머지한다.
interface GuestCaseDetailRow {
  userSeq: number
  accessList: { caseSeq: number; guardCode: string; isAccess: boolean }[] | null
}

export async function getGuestCaseAccess(userSeq: number): Promise<GuestCaseCandidate[]> {
  const res = await apiFetch(`${GUEST_BASE}/GetGuestCaseDetail?userSeq=${userSeq}`)
  if (!res.ok) {
    throw new Error('게스트 조회권을 불러오지 못했습니다')
  }
  const data = await unwrapEnvelope<GuestCaseDetailRow>(res)
  return (data.accessList ?? []).map((a) => ({
    caseSeq: a.caseSeq,
    mgmtNo: '',
    guardCode: a.guardCode,
    isAccess: a.isAccess,
  }))
}

// memo(비고)는 빈 문자열이면 null로 정규화해 보낸다 — 백엔드가 nullable string으로
// 받는다(maxLength 1000).
function normalizeMemo(memo: string | undefined): string | null {
  const trimmed = memo?.trim()
  return trimmed ? trimmed : null
}

// 발급 — 아이디는 서버가 자동 생성(loginId), 초기 비밀번호는 아이디와 동일.
// 응답은 {data:true}뿐이라 발급 후 목록 재조회로 새 계정을 확인한다.
export async function issueGuestAccount(caseSeqs: number[], memo?: string): Promise<void> {
  const res = await apiFetch(`${GUEST_BASE}/AddGuestUser`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: GUEST_DISPLAY_NAME, caseSeqs, memo: normalizeMemo(memo) }),
  })
  if (!res.ok) {
    throw new Error('게스트 계정 발급에 실패했습니다')
  }
}

// 조회권 + 비고 수정 — accessList의 isAccess=true인 항목이 수정 후 최종 상태(false·
// 누락은 회수). 후보 전체를 명시적 true/false로 되돌린다.
export async function updateGuestAccount(
  userSeq: number,
  accessList: { caseSeq: number; guardCode: string; isAccess: boolean }[],
  memo?: string,
): Promise<void> {
  const res = await apiFetch(`${GUEST_BASE}/UpdateGuestCaseInfo`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userSeq, accessList, memo: normalizeMemo(memo) }),
  })
  if (!res.ok) {
    throw new Error('게스트 계정 수정에 실패했습니다')
  }
}

export async function deleteGuestAccount(userSeq: number): Promise<void> {
  const res = await apiFetch(`${GUEST_BASE}/DeleteGuestUser`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userSeq }),
  })
  if (!res.ok) {
    throw new Error('게스트 계정 삭제에 실패했습니다')
  }
}
