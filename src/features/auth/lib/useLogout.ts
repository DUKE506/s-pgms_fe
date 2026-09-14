import { useNavigate } from 'react-router'
import { logout } from '../api/auth'
import { useAuthStore } from '../store/authStore'

// PoliceAppShell/CompanyAppShell/SettingsPage가 전부 동일한 로그아웃 절차
// (서버 세션 종료 → 로컬 상태 초기화 → 로그인 화면 이동)를 쓰던 걸 하나로
// 모음(2026-09-14, 설정 페이지 신설하며 중복 발견).
export function useLogout() {
  const navigate = useNavigate()

  return async function handleLogout() {
    await logout()
    useAuthStore.getState().logout()
    navigate('/')
  }
}
