import { apiFetch } from './client'
import { unwrapEnvelope } from '@/shared/api/envelope'
import { roleFromCodeSeq } from '../lib/roleMapping'
import type { AuthSession } from '../store/authStore'

// 최초 로그인 강제 비밀번호 변경(게스트 발급/관리자 비밀번호 초기화 직후) —
// 로그인 자체는 성공했지만 세션은 발급되지 않은 상태. 실제 백엔드는 이 경우
// HTTP 428로 신호를 준다(docs/backend-integration-responses/Login-Login.md).
export interface MustChangePasswordResult {
  mustChangePassword: true
  id: string
}

interface LoginTokens {
  accessToken: string
  refreshToken: string
}

interface MyProfile {
  userSeq: number
  userName: string
  codeSeq: number
  codeName: string
  groupSeq: number | null
  groupName: string | null
}

async function fetchProfile(accessToken: string): Promise<MyProfile> {
  const res = await fetch('/api/v1/Login/W/GetMyProfile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('프로필 조회에 실패했습니다')
  return unwrapEnvelope<MyProfile>(res)
}

export async function login(id: string, password: string): Promise<AuthSession | MustChangePasswordResult> {
  const res = await apiFetch('/v1/Login/W/Login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: id, loginPw: password }),
  })

  if (res.status === 428) {
    return { mustChangePassword: true, id }
  }
  if (!res.ok) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다')
  }

  const tokens = await unwrapEnvelope<LoginTokens>(res)
  const profile = await fetchProfile(tokens.accessToken)

  return {
    user: { id, name: profile.userName, role: roleFromCodeSeq(profile.codeSeq) },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  }
}

// 최초 로그인 강제 변경 모달 전용 — 실제 API는 Authorization 헤더도, 기존
// 비밀번호도 요구하지 않는다(loginId만으로 대상 계정을 찾고, pwChangedYn=true
// 상태가 아니면 400). 아직 세션이 없는 시점(로그인 자체가 428로 막힘)이라
// apiFetch 대신 인증 없는 요청을 그대로 보낸다.
export async function changeInitialPassword(id: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/v1/Login/W/ChangePassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: id, loginPw: newPassword }),
  })

  if (!res.ok) {
    throw new Error('비밀번호 변경에 실패했습니다')
  }
}

// 로컬 상태만 지우던 mock과 달리 실제로는 서버 세션이 즉시 종료된다 — 로그아웃
// 버튼(PoliceAppShell/CompanyAppShell)에서 로컬 상태를 지우기 전에 호출한다.
// 실패해도(이미 만료된 토큰 등) 로컬 로그아웃은 그대로 진행하는 게 맞아서
// 호출부에서 에러를 무시할 수 있게 던지지 않는다.
export async function logout(): Promise<void> {
  try {
    await apiFetch('/v1/Login/W/Logout', { method: 'POST' })
  } catch {
    // 네트워크 에러 등으로 서버 세션 종료에 실패해도 로컬 로그아웃은 계속한다.
  }
}
