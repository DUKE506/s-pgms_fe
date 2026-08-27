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
import SecurityCaseEditPage from '../features/police/pages/SecurityCaseEditPage'
import PoliceSecurityCaseListPage from '../features/police/pages/SecurityCaseListPage'
import PoliceSecurityCaseDetailPage from '../features/police/pages/SecurityCaseDetailPage'
import HistoryListPage from '../features/police/pages/HistoryListPage'
import HistoryDetailPage from '../features/police/pages/HistoryDetailPage'
import RequestListPage from '../features/company/pages/RequestListPage'
import PeriodRequestListPage from '../features/company/pages/PeriodRequestListPage'
import WorkerListPage from '../features/company/pages/WorkerListPage'
import SecurityCaseDetailPage from '../features/company/pages/SecurityCaseDetailPage'
import SecurityCaseListPage from '../features/company/pages/SecurityCaseListPage'

const POLICE_DASHBOARD: Role[] = ['본청', '지역청', '경찰서']
const POLICE_HISTORY: Role[] = ['본청', '지역청', '경찰서']
const POLICE_STATION_AND_GUEST: Role[] = ['경찰서', '게스트']
const POLICE_STATION_ONLY: Role[] = ['경찰서']
// 본청/지역청은 이력 조회(Phase 3-1)에서 진행중 건을 클릭하면 이 상세 화면으로
// 온다 — 조회 전용이라 SecurityCaseDetailPage 쪽에서 role에 따라 액션 버튼을
// 숨긴다(2026-08-27 결정).
const POLICE_DETAIL_VIEWERS: Role[] = ['경찰서', '게스트', '본청', '지역청']
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
  {
    path: '/history',
    element: (
      <ProtectedRoute allow={POLICE_HISTORY}>
        <PoliceAppShell>
          <HistoryListPage />
        </PoliceAppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/history/:id',
    element: (
      <ProtectedRoute allow={POLICE_HISTORY}>
        <PoliceAppShell>
          <HistoryDetailPage />
        </PoliceAppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/security-cases',
    element: (
      <ProtectedRoute allow={POLICE_STATION_AND_GUEST}>
        <PoliceAppShell>
          <PoliceSecurityCaseListPage />
        </PoliceAppShell>
      </ProtectedRoute>
    ),
  },
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
  {
    path: '/security-cases/:id',
    element: (
      <ProtectedRoute allow={POLICE_DETAIL_VIEWERS}>
        <PoliceAppShell>
          <PoliceSecurityCaseDetailPage />
        </PoliceAppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/security-cases/:id/edit',
    element: (
      <ProtectedRoute allow={POLICE_STATION_ONLY}>
        <PoliceAppShell>
          <SecurityCaseEditPage />
        </PoliceAppShell>
      </ProtectedRoute>
    ),
  },
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
  {
    path: '/admin/security-cases',
    element: (
      <ProtectedRoute allow={COMPANY_ALL}>
        <CompanyAppShell>
          <SecurityCaseListPage />
        </CompanyAppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/period-requests/extension',
    element: (
      <ProtectedRoute allow={COMPANY_ALL}>
        <CompanyAppShell>
          <PeriodRequestListPage type="연장" />
        </CompanyAppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/period-requests/shorten',
    element: (
      <ProtectedRoute allow={COMPANY_ALL}>
        <CompanyAppShell>
          <PeriodRequestListPage type="단축" />
        </CompanyAppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/security-cases/:id',
    element: (
      <ProtectedRoute allow={COMPANY_ALL}>
        <CompanyAppShell>
          <SecurityCaseDetailPage />
        </CompanyAppShell>
      </ProtectedRoute>
    ),
  },
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
