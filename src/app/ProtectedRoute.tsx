import { useEffect, useRef, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuthStore, type Role } from '../features/auth/store/authStore'
import { getDefaultRouteForRole } from '../features/auth/lib/defaultRoute'
import { useToastStore } from '../shared/hooks/useToastStore'

interface ProtectedRouteProps {
  allow: Role[]
  children: ReactNode
}

function ProtectedRoute({ allow, children }: ProtectedRouteProps) {
  const user = useAuthStore((state) => state.user)
  const { pathname } = useLocation()
  const forbidden = user !== null && !allow.includes(user.role)

  // 토스트는 이 컴포넌트보다 오래 살아남아야 함 — 리다이렉트된 화면에서도
  // 계속 보여야 하므로 언마운트 시 cleanup으로 지울 수 없음. 즉 StrictMode의
  // dev 전용 mount→cleanup→mount를 cleanup 함수로 무력화할 수 없어서,
  // 두 번째 mount에서 중복 표시되지 않도록 ref로 가드함.
  const hasShownToast = useRef(false)
  useEffect(() => {
    if (forbidden && !hasShownToast.current) {
      hasShownToast.current = true
      useToastStore.getState().show('접근 권한이 없습니다', 'error')
    }
  }, [forbidden])

  if (!user) {
    return <Navigate to={pathname.startsWith('/admin') ? '/admin' : '/'} replace />
  }

  if (forbidden) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />
  }

  return children
}

export default ProtectedRoute
