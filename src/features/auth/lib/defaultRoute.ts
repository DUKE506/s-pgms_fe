import type { Role } from '../store/authStore'

const DEFAULT_ROUTE_BY_ROLE: Record<Role, string> = {
  본청: '/dashboard',
  지역청: '/dashboard',
  경찰서: '/security-cases',
  게스트: '/security-cases',
  시스템관리자: '/admin/dashboard',
  운영관리자: '/admin/dashboard',
  본부관리자: '/admin/dashboard',
}

export function getDefaultRouteForRole(role: Role): string {
  return DEFAULT_ROUTE_BY_ROLE[role]
}
