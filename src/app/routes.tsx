import type { RouteObject } from 'react-router'
import PoliceLoginPage from '../features/auth/pages/PoliceLoginPage'
import CompanyLoginPage from '../features/auth/pages/CompanyLoginPage'
import DashboardStub from './DashboardStub'

export const routes: RouteObject[] = [
  { path: '/', element: <PoliceLoginPage /> },
  { path: '/dashboard', element: <DashboardStub label="경찰" /> },
  { path: '/admin', element: <CompanyLoginPage /> },
  { path: '/admin/dashboard', element: <DashboardStub label="본사" /> },
]
