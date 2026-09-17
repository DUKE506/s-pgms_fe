import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PoliceRole = '본청' | '지역청' | '경찰서' | '게스트'
export type CompanyRole = '시스템관리자' | '운영관리자' | '본부관리자'
export type Role = PoliceRole | CompanyRole

export interface AuthUser {
  id: string
  name: string
  role: Role
  // 실제 백엔드 GetMyProfile의 groupSeq/groupName — 경찰 조직트리 노드.
  // 경찰서(피전) 계정만 값이 있고 본사 계정은 null(Login-GetMyProfile.md 실측).
  // Deploy/Police 계열 API가 groupSeq를 필수 파라미터로 요구해서 세션에 싣는다.
  groupSeq?: number | null
  groupName?: string | null
  // GetMyProfile의 userSeq — 계정 비밀번호 초기화 API가 대상을 userSeq로
  // 지정해서, "내 계정"을 별도 조회 없이 바로 식별하려고 세션에 싣는다
  // (2026-09-17). 기존 테스트 더블들이 안 채워도 되도록 옵셔널로 둔다.
  userSeq?: number
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  setSession: (session: AuthSession) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'auth-storage' },
  ),
)
