import { apiFetch } from '../../auth/api/client'

export interface GuestAccount {
  id: string
  name: string
  policeStation: string
  caseIds: string[]
  issuedAt: string
  // 로그인 비밀번호 — 발급 시점엔 아이디와 동일(mocks/data/guests.ts), 최초
  // 로그인 강제 변경(후속 항목) 완료 후에는 사용자가 설정한 값으로 바뀐다.
  password?: string
  mustChangePassword?: boolean
}

// 화면 9: 소속 경찰서의 게스트 계정만 서버(mock)에서 필터링되어 내려온다.
export async function listGuestAccounts(): Promise<GuestAccount[]> {
  const res = await apiFetch('/guests')
  if (!res.ok) {
    throw new Error('게스트 계정 목록을 불러오지 못했습니다')
  }
  return res.json() as Promise<GuestAccount[]>
}

// 화면 10: 발급 전 자동생성 아이디를 미리 보여주기 위한 조회.
export async function previewNextGuestAccount(): Promise<{ id: string; name: string }> {
  const res = await apiFetch('/guests/next-id')
  if (!res.ok) {
    throw new Error('자동생성 아이디를 불러오지 못했습니다')
  }
  return res.json() as Promise<{ id: string; name: string }>
}

// 화면 10: 아이디는 서버가 자동 생성 — 클라이언트는 조회가능 경호건만 넘긴다.
export async function issueGuestAccount(caseIds: string[]): Promise<GuestAccount> {
  const res = await apiFetch('/guests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseIds }),
  })
  if (!res.ok) {
    throw new Error('게스트 계정 발급에 실패했습니다')
  }
  return res.json() as Promise<GuestAccount>
}

export async function updateGuestAccount(id: string, caseIds: string[]): Promise<GuestAccount> {
  const res = await apiFetch(`/guests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseIds }),
  })
  if (!res.ok) {
    throw new Error('게스트 계정 수정에 실패했습니다')
  }
  return res.json() as Promise<GuestAccount>
}

export async function deleteGuestAccount(id: string): Promise<void> {
  const res = await apiFetch(`/guests/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error('게스트 계정 삭제에 실패했습니다')
  }
}
