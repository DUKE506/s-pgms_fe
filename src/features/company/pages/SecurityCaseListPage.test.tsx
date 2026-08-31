import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SecurityCaseListPage from './SecurityCaseListPage'
import { companyAccounts } from '../../../mocks/data/accounts'
import { assignManager, securityCases } from '../../../mocks/data/securityCases'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/admin/security-cases', element: <SecurityCaseListPage /> },
      { path: '/admin/security-cases/:id', element: <p>상세 도착</p> },
    ],
    { initialEntries: ['/admin/security-cases'] },
  )
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
}

function loginAs(accountId: string) {
  const account = companyAccounts.find((a) => a.id === accountId)!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
}

function withinTable() {
  return within(screen.getByRole('table'))
}

describe('SecurityCaseListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('접수 상태 건은 제외하고 배정 이후 건만 목록에 표시한다', async () => {
    loginAsAdmin()
    const record = securityCases.find((c) => c.receiptNumber === '26-02-강남경찰서')!
    assignManager(record.id, 'hqmanager1')
    renderPage()

    await screen.findAllByText(`26-02-강남경찰서 · ${record.securityCode}`)
    expect(
      withinTable().getByText(`26-02-강남경찰서 · ${record.securityCode}`),
    ).toBeInTheDocument()
    // 아직 배정 안 된(접수 상태) 건은 목록에서 빠져 있어야 한다.
    expect(screen.queryByText('26-02-분당경찰서')).not.toBeInTheDocument()
  })

  it('배정된 건은 관리번호(접수번호 · 경호코드)와 담당자·본부가 함께 표시된다', async () => {
    loginAsAdmin()
    const record = securityCases.find((c) => c.receiptNumber === '26-02-서초경찰서')!
    assignManager(record.id, 'hqmanager1')
    renderPage()

    await screen.findAllByText(`26-02-서초경찰서 · ${record.securityCode}`)
    const row = withinTable().getByText(`26-02-서초경찰서 · ${record.securityCode}`).closest('tr')!
    expect(within(row).getByText('김민수')).toBeInTheDocument()
    expect(within(row).getByText('서울본부')).toBeInTheDocument()
    expect(within(row).getByText('배정')).toBeInTheDocument()
  })

  it('상태 필터로 목록을 좁힐 수 있다', async () => {
    loginAsAdmin()
    // 다른 테스트에서 이미 배정 상태로 바뀔 수 있는 건들과 안 겹치게 부산진경찰서
    // 건으로 검증한다 (모듈 싱글톤 securityCases 공유).
    const record = securityCases.find((c) => c.receiptNumber === '26-02-부산진경찰서')!
    assignManager(record.id, 'hqmanager4')
    renderPage()
    await screen.findAllByText(`26-02-부산진경찰서 · ${record.securityCode}`)

    fireEvent.click(screen.getByLabelText('상태 선택'))
    fireEvent.click(await screen.findByRole('option', { name: '배정' }))

    expect(withinTable().getByText(`26-02-부산진경찰서 · ${record.securityCode}`)).toBeInTheDocument()
  })

  it('행을 클릭하면 해당 경호건 상세로 이동한다', async () => {
    loginAsAdmin()
    // 종로경찰서 건은 다른 테스트에서 손대지 않아 여기서 직접 배정한다 — 접수
    // 상태 건은 더 이상 목록에 뜨지 않으므로 클릭 대상이 되려면 배정이 필요하다.
    const record = securityCases.find((c) => c.receiptNumber === '26-02-종로경찰서')!
    assignManager(record.id, 'hqmanager2')
    renderPage()
    await screen.findAllByText(`26-02-종로경찰서 · ${record.securityCode}`)

    fireEvent.click(withinTable().getByText(`26-02-종로경찰서 · ${record.securityCode}`))

    expect(await screen.findByText('상세 도착')).toBeInTheDocument()
  })

  it('본부관리자는 본인이 배정받은 경호건만 목록에 표시된다', async () => {
    // case-seed-6(ST101)은 김민수, case-seed-7(ST102)은 이영희, case-seed-8(ST103)은
    // 박준혁 담당으로 seed돼 있다 — 다른 테스트가 건드리지 않는 고정 배정 건들이다.
    loginAs('hqmanager1') // 김민수
    renderPage()

    await screen.findAllByText('26-01-강남경찰서 · ST101')
    expect(withinTable().getByText('26-01-강남경찰서 · ST101')).toBeInTheDocument()
    expect(screen.queryByText('26-03-강남경찰서 · ST102')).not.toBeInTheDocument()
    expect(screen.queryByText('26-04-강남경찰서 · ST103')).not.toBeInTheDocument()
  })
})
