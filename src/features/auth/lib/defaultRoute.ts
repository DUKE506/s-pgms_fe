import type { Role } from '../store/authStore'

// 본사 대시보드(/admin/dashboard)는 메뉴에서 제외하고 개발도 보류 중이라
// 기본 랜딩에서도 제외 — 경호관리(경호목록)로 대체(2026-09-15).
const DEFAULT_ROUTE_BY_ROLE: Record<Role, string> = {
  본청: '/dashboard',
  지역청: '/dashboard',
  경찰서: '/dashboard',
  게스트: '/security-cases',
  시스템관리자: '/admin/security-cases',
  운영관리자: '/admin/security-cases',
  본부관리자: '/admin/security-cases',
}

export function getDefaultRouteForRole(role: Role): string {
  return DEFAULT_ROUTE_BY_ROLE[role]
}
