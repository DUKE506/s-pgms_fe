import { describe, expect, it } from 'vitest'
import { getDefaultRouteForRole } from './defaultRoute'

describe('getDefaultRouteForRole', () => {
  it.each([
    ['본청', '/dashboard'],
    ['지역청', '/dashboard'],
    ['경찰서', '/security-cases'],
    ['게스트', '/security-cases'],
    ['시스템관리자', '/admin/dashboard'],
    ['운영관리자', '/admin/dashboard'],
    ['본부관리자', '/admin/dashboard'],
  ] as const)('maps %s to %s', (role, path) => {
    expect(getDefaultRouteForRole(role)).toBe(path)
  })
})
