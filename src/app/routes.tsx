import type { ReactNode } from 'react'
import type { RouteObject } from 'react-router'
import PoliceLoginPage from '../features/auth/pages/PoliceLoginPage'
import CompanyLoginPage from '../features/auth/pages/CompanyLoginPage'
import PoliceAppShell from '../features/police/layout/PoliceAppShell'
import CompanyAppShell from '../features/company/layout/CompanyAppShell'
import type { Role } from '../features/auth/store/authStore'
import ProtectedRoute from './ProtectedRoute'
import ScreenPlaceholder from '../shared/components/ScreenPlaceholder'
import SecurityCaseNewPage from '../features/police/pages/SecurityCaseNewPage'
import RequestListPage from '../features/company/pages/RequestListPage'
import WorkerListPage from '../features/company/pages/WorkerListPage'

const POLICE_DASHBOARD: Role[] = ['본청', '지역청', '경찰서']
const POLICE_HISTORY: Role[] = ['본청', '지역청', '경찰서']
const POLICE_STATION_AND_GUEST: Role[] = ['경찰서', '게스트']
const POLICE_STATION_ONLY: Role[] = ['경찰서']
const COMPANY_ALL: Role[] = ['시스템관리자', '운영관리자', '본부관리자']
// 본부관리자는 "본인이 배정받은 경호건"만 조회/처리 가능 — 배치요청 목록/담당자
// 배정은 그 위 권한(시스템관리자/운영관리자)만 접근 (project-overview.md 계정 권한 체계)
const COMPANY_ADMIN: Role[] = ['시스템관리자', '운영관리자']

function policeScreen(allow: Role[], label: string, screenIds: string[]): ReactNode {
  return (
    <ProtectedRoute allow={allow}>
      <PoliceAppShell>
        <ScreenPlaceholder label={label} screenIds={screenIds} />
      </PoliceAppShell>
    </ProtectedRoute>
  )
}

function companyScreen(allow: Role[], label: string, screenIds: string[]): ReactNode {
  return (
    <ProtectedRoute allow={allow}>
      <CompanyAppShell>
        <ScreenPlaceholder label={label} screenIds={screenIds} />
      </CompanyAppShell>
    </ProtectedRoute>
  )
}

export const routes: RouteObject[] = [
  { path: '/', element: <PoliceLoginPage /> },
  { path: '/dashboard', element: policeScreen(POLICE_DASHBOARD, '현황', ['1', '2']) },
  { path: '/history', element: policeScreen(POLICE_HISTORY, '이력 조회 목록', ['1h', '2h', '8']) },
  { path: '/history/:id', element: policeScreen(POLICE_HISTORY, '이력 상세', ['1h', '2h', '8h']) },
  { path: '/security-cases', element: policeScreen(POLICE_STATION_AND_GUEST, '경호목록', ['3']) },
  {
    path: '/security-cases/new',
    element: (
      <ProtectedRoute allow={POLICE_STATION_ONLY}>
        <PoliceAppShell>
          <SecurityCaseNewPage />
        </PoliceAppShell>
      </ProtectedRoute>
    ),
  },
  { path: '/security-cases/:id', element: policeScreen(POLICE_STATION_AND_GUEST, '경호 상세', ['5']) },
  { path: '/guests', element: policeScreen(POLICE_STATION_ONLY, '게스트 계정 관리', ['9']) },

  { path: '/admin', element: <CompanyLoginPage /> },
  { path: '/admin/dashboard', element: companyScreen(COMPANY_ALL, '본사 전체 대시보드', ['6']) },
  {
    path: '/admin/requests',
    element: (
      <ProtectedRoute allow={COMPANY_ADMIN}>
        <CompanyAppShell>
          <RequestListPage />
        </CompanyAppShell>
      </ProtectedRoute>
    ),
  },
  { path: '/admin/security-cases', element: companyScreen(COMPANY_ALL, '경호목록', ['6d']) },
  { path: '/admin/security-cases/:id', element: companyScreen(COMPANY_ALL, '배정 경호건 상세', ['7']) },
  {
    path: '/admin/workers',
    element: (
      <ProtectedRoute allow={COMPANY_ALL}>
        <CompanyAppShell>
          <WorkerListPage />
        </CompanyAppShell>
      </ProtectedRoute>
    ),
  },
  { path: '/admin/history', element: companyScreen(COMPANY_ALL, '이력 조회', ['12']) },
]
