import { http, HttpResponse } from 'msw'
import {
  companyAccounts,
  resetCompanyAccountPassword,
  updateCompanyAccountInfo,
  type Account,
} from '../data/accounts'
import { securityCases } from '../data/securityCases'

function companyAccountFromAuthHeader(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.replace('Bearer ', '')
  const accountId = token.split('.')[1]
  return companyAccounts.find((a) => a.id === accountId)
}

// 관리자 계정 관리(Phase 3.6 항목2) 조회 범위 — 시스템관리자/운영관리자/본부관리자
// 모두 전체 계정 목록을 조회할 수 있다(2026-08-31 재확정). 실제 수정/초기화 가능
// 여부는 아래 canEditInfo/canResetPassword가 별도로 판정한다.
function visibleAccountsFor(): Account[] {
  return companyAccounts
}

// 정보수정(이름/연락처) 권한 — 역할 무관 본인만 가능(2026-08-31 재확정, roadmap.md
// Phase 3.6 참고. 이전엔 시스템관리자가 타인 정보도 수정 가능했으나 폐기됨).
function canEditInfo(actor: Account, target: Account): boolean {
  return actor.id === target.id
}

// 비밀번호 초기화 권한 — 본인은 항상 가능, 그 외엔 상위 역할이 하위 역할을
// 초기화할 수 있다(시스템관리자→운영관리자/본부관리자, 운영관리자→본부관리자).
function canResetPassword(actor: Account, target: Account): boolean {
  if (actor.id === target.id) return true
  if (actor.role === '시스템관리자') return true
  if (actor.role === '운영관리자') return target.role === '본부관리자'
  return false
}

// 본부관리자당 실제 배정 건수 — 종결/취소 제외(담당경호 목록과 동일 기준).
// GET /api/security-cases는 본부관리자 조회 시 본인 건만 스코프 필터링되므로
// (경호관리 화면 규칙), 이 화면의 전체 배정건수 집계는 그 스코프와 무관하게
// securityCases 전체에서 직접 계산해야 한다(2026-08-31, 관리자 계정 관리 작업 중
// 발견 — 본부관리자로 보면 다른 본부관리자 배정건수가 전부 0으로 잘못 보이던 버그).
function assignedCountFor(accountId: string): number {
  return securityCases.filter(
    (c) => c.assigneeId === accountId && c.status !== '종결' && c.status !== '취소',
  ).length
}

function toManagerAccount(a: Account) {
  return {
    id: a.id,
    name: a.name,
    role: a.role,
    branch: a.branch,
    phone: a.phone,
    assignedCount: a.role === '본부관리자' ? assignedCountFor(a.id) : undefined,
  }
}

export const companyAccountHandlers = [
  http.get('/api/company-accounts', ({ request }) => {
    const actor = companyAccountFromAuthHeader(request)
    if (!actor) return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    return HttpResponse.json(visibleAccountsFor().map(toManagerAccount))
  }),

  http.put('/api/company-accounts/:id', async ({ request, params }) => {
    const actor = companyAccountFromAuthHeader(request)
    if (!actor) return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    const target = companyAccounts.find((a) => a.id === params.id)
    if (!target) return HttpResponse.json({ message: '계정을 찾을 수 없습니다' }, { status: 404 })
    if (!canEditInfo(actor, target)) {
      return HttpResponse.json({ message: '정보수정 권한이 없습니다' }, { status: 403 })
    }
    const { name, phone } = (await request.json()) as { name: string; phone?: string }
    const updated = updateCompanyAccountInfo(target.id, { name, phone })
    return HttpResponse.json(updated ? toManagerAccount(updated) : null)
  }),

  http.post('/api/company-accounts/:id/reset-password', ({ request, params }) => {
    const actor = companyAccountFromAuthHeader(request)
    if (!actor) return HttpResponse.json({ message: '인증이 필요합니다' }, { status: 401 })
    const target = companyAccounts.find((a) => a.id === params.id)
    if (!target) return HttpResponse.json({ message: '계정을 찾을 수 없습니다' }, { status: 404 })
    if (!canResetPassword(actor, target)) {
      return HttpResponse.json({ message: '비밀번호 초기화 권한이 없습니다' }, { status: 403 })
    }
    resetCompanyAccountPassword(target.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
