import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PeriodRequestListPage from './PeriodRequestListPage'
import { approvePeriodRequest } from '../api/requests'
import { companyAccounts } from '../../../mocks/data/accounts'
import { securityCases } from '../../../mocks/data/securityCases'
import { useAuthStore } from '../../auth/store/authStore'
import type { SecurityCaseStatus } from '../../police/types/securityCase'

// case-seed-7: 유일한 경호중 seed 건(baseInfo+workSchedule 풀세트, 2026-01-05~01-19,
// 15일). pendingPeriodRequest가 없는 상태로 시작하므로 각 테스트에서 직접 세팅한다.
const CASE_ID = 'case-seed-7'
const ORIGINAL_END_DATE = '2026-01-19'

function renderPage(type: '연장' | '단축') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/', element: <PeriodRequestListPage type={type} /> }], {
    initialEntries: ['/'],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function loginAsAdmin() {
  const account = companyAccounts.find((a) => a.id === 'opadmin')!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
  return account
}

function loginAs(accountId: string) {
  const account = companyAccounts.find((a) => a.id === accountId)!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
  return account
}

function withinTable() {
  return within(screen.getByRole('table'))
}

function setPendingRequest(type: '연장' | '단축', requestedEndDate: string) {
  const record = securityCases.find((c) => c.id === CASE_ID)!
  record.pendingPeriodRequest = {
    type,
    requestedEndDate,
    requestedAt: '2026-01-15T00:00:00.000Z',
  }
}

describe('PeriodRequestListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    const record = securityCases.find((c) => c.id === CASE_ID)!
    record.status = '경호중' as SecurityCaseStatus
    record.endDate = ORIGINAL_END_DATE
    record.pendingPeriodRequest = undefined
    record.workSchedule!.days = record.workSchedule!.days.filter((d) => d.date <= ORIGINAL_END_DATE)
  })

  it('연장요청 건을 목록에 표시한다', async () => {
    setPendingRequest('연장', '2026-01-24')
    loginAsAdmin()
    renderPage('연장')

    await screen.findAllByText('26-03-강남경찰서')
    expect(withinTable().getByText('26-03-강남경찰서')).toBeInTheDocument()
  })

  it('단축요청 건은 연장요청 탭에는 보이지 않는다', async () => {
    setPendingRequest('단축', '2026-01-15')
    loginAsAdmin()
    renderPage('연장')

    await waitFor(() => expect(screen.getByText('연장요청이 없습니다')).toBeInTheDocument())
    expect(screen.queryByText('26-03-강남경찰서')).not.toBeInTheDocument()
  })

  it('승인하면 배치기간·스케줄이 갱신되고 목록에서 사라진다', async () => {
    setPendingRequest('연장', '2026-01-24')
    loginAsAdmin()
    renderPage('연장')
    await screen.findAllByText('26-03-강남경찰서')

    fireEvent.pointerDown(withinTable().getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '승인' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '승인' }))

    await waitFor(() => expect(screen.queryByText('26-03-강남경찰서')).not.toBeInTheDocument())
    const updated = securityCases.find((c) => c.id === CASE_ID)!
    expect(updated.endDate).toBe('2026-01-24')
    expect(updated.pendingPeriodRequest).toBeUndefined()
    expect(updated.workSchedule!.days).toHaveLength(20)
  })

  it('거부하면 pendingPeriodRequest만 해제되고 배치기간은 그대로 목록에서 사라진다', async () => {
    setPendingRequest('단축', '2026-01-15')
    loginAsAdmin()
    renderPage('단축')
    await screen.findAllByText('26-03-강남경찰서')

    fireEvent.pointerDown(withinTable().getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '거부' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '거부' }))

    await waitFor(() => expect(screen.queryByText('26-03-강남경찰서')).not.toBeInTheDocument())
    const updated = securityCases.find((c) => c.id === CASE_ID)!
    expect(updated.pendingPeriodRequest).toBeUndefined()
    expect(updated.endDate).toBe(ORIGINAL_END_DATE)
  })

  it('본부관리자는 본인이 담당하는 건만 목록에 표시된다', async () => {
    // case-seed-7 담당자는 이영희(hqmanager2)
    setPendingRequest('연장', '2026-01-24')
    loginAs('hqmanager2')
    renderPage('연장')

    await screen.findAllByText('26-03-강남경찰서')
    expect(withinTable().getByText('26-03-강남경찰서')).toBeInTheDocument()
  })

  it('담당자가 아닌 본부관리자에게는 목록에 표시되지 않는다', async () => {
    setPendingRequest('연장', '2026-01-24')
    loginAs('hqmanager1') // 김민수 — case-seed-7 담당자 아님
    renderPage('연장')

    await waitFor(() => expect(screen.getByText('연장요청이 없습니다')).toBeInTheDocument())
    expect(screen.queryByText('26-03-강남경찰서')).not.toBeInTheDocument()
  })

  it('담당자가 아닌 본부관리자는 승인 API를 직접 호출해도 거부된다', async () => {
    setPendingRequest('연장', '2026-01-24')
    loginAs('hqmanager1') // 김민수 — case-seed-7 담당자 아님

    await expect(approvePeriodRequest(CASE_ID)).rejects.toThrow('승인에 실패했습니다')
    const updated = securityCases.find((c) => c.id === CASE_ID)!
    expect(updated.pendingPeriodRequest).toBeDefined()
  })
})
