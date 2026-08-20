import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import PoliceLoginPage from '../features/auth/pages/PoliceLoginPage'
import CompanyLoginPage from '../features/auth/pages/CompanyLoginPage'
import type { Role } from '../features/auth/store/authStore'
import ProtectedRoute from './ProtectedRoute'
import ScreenPlaceholder from '../shared/components/ScreenPlaceholder'

const POLICE_LEADERSHIP: Role[] = ['본청', '지역청']
const POLICE_HISTORY: Role[] = ['본청', '지역청', '경찰서']
const POLICE_STATION_AND_GUEST: Role[] = ['경찰서', '게스트']
const POLICE_STATION_ONLY: Role[] = ['경찰서']
const COMPANY_ALL: Role[] = ['시스템관리자', '운영관리자', '본부관리자']

function screen(allow: Role[], label: string, screenIds: string[]): ReactNode {
  return (
    <ProtectedRoute allow={allow}>
      <ScreenPlaceholder label={label} screenIds={screenIds} />
    </ProtectedRoute>
  )
}

export const routes: RouteObject[] = [
  { path: '/', element: <PoliceLoginPage /> },
  { path: '/dashboard', element: screen(POLICE_LEADERSHIP, '본청/지역청 대시보드', ['1', '2']) },
  { path: '/history', element: screen(POLICE_HISTORY, '이력 조회 목록', ['1h', '2h', '8']) },
  { path: '/history/:id', element: screen(POLICE_HISTORY, '이력 상세', ['1h', '2h', '8h']) },
  { path: '/security-cases', element: screen(POLICE_STATION_AND_GUEST, '경호목록', ['3']) },
  { path: '/security-cases/new', element: screen(POLICE_STATION_ONLY, '접수/배치요구서 작성', ['4']) },
  { path: '/security-cases/:id', element: screen(POLICE_STATION_AND_GUEST, '경호 상세', ['5']) },
  { path: '/guests', element: screen(POLICE_STATION_ONLY, '게스트 계정 관리', ['9']) },

  { path: '/admin', element: <CompanyLoginPage /> },
  { path: '/admin/dashboard', element: screen(COMPANY_ALL, '본사 전체 대시보드', ['6']) },
  { path: '/admin/requests', element: screen(COMPANY_ALL, '배치요청 목록', ['6b']) },
  { path: '/admin/security-cases', element: screen(COMPANY_ALL, '경호목록', ['6d']) },
  { path: '/admin/security-cases/:id', element: screen(COMPANY_ALL, '배정 경호건 상세', ['7']) },
  { path: '/admin/workers', element: screen(COMPANY_ALL, '근무자 목록', ['11']) },
  { path: '/admin/history', element: screen(COMPANY_ALL, '이력 조회', ['12']) },
]
