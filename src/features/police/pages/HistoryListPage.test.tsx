import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HistoryListPage from './HistoryListPage'
import { policeAccounts, type Account } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/history', element: <HistoryListPage /> },
      { path: '/history/:id', element: <p>이력 상세 도착</p> },
      { path: '/security-cases/:id', element: <p>경호 상세 도착</p> },
    ],
    { initialEntries: ['/history'] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function loginAs(role: Account['role']) {
  const account = policeAccounts.find((a) => a.role === role)!
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

describe('HistoryListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('본청은 전체 경찰서의 전체 상태(진행중 포함) 이력을 조회한다', async () => {
    loginAs('본청')
    renderPage()

    await screen.findAllByText('25-11-강남경찰서 · ST110')
    expect(withinTable().getByText('25-11-강남경찰서 · ST110')).toBeInTheDocument()
    expect(withinTable().getByText('25-07-분당경찰서 · ST114')).toBeInTheDocument()
    expect(withinTable().getByText('25-05-부산진경찰서 · ST116')).toBeInTheDocument()
    // 진행중(배정) 건도 함께 보인다 — Phase4 대시보드 미구현으로 인한 확장(2026-08-27)
    expect(withinTable().getByText('26-01-강남경찰서 · ST101')).toBeInTheDocument()
  })

  it('본청이 진행중 건을 클릭하면 기존 경호 상세 화면(조회 전용)으로 이동한다', async () => {
    loginAs('본청')
    renderPage()
    await screen.findAllByText('26-01-강남경찰서 · ST101')

    fireEvent.click(withinTable().getByText('26-01-강남경찰서 · ST101'))

    expect(await screen.findByText('경호 상세 도착')).toBeInTheDocument()
  })

  it('경찰서는 진행중 건을 이력에서 보지 않는다(경호목록 화면 소관)', async () => {
    loginAs('경찰서')
    renderPage()
    await screen.findAllByText('25-11-강남경찰서 · ST110')

    expect(screen.queryByText('26-01-강남경찰서 · ST101')).not.toBeInTheDocument()
  })

  it('지역청은 자기 관할 경찰서 이력만 조회한다', async () => {
    loginAs('지역청')
    renderPage()

    await screen.findAllByText('25-07-분당경찰서 · ST114')
    expect(withinTable().getByText('25-07-분당경찰서 · ST114')).toBeInTheDocument()
    expect(withinTable().getByText('25-06-분당경찰서 · ST115')).toBeInTheDocument()
    expect(screen.queryByText(/강남경찰서/)).not.toBeInTheDocument()
  })

  it('경찰서는 자기 서 이력만 조회하고, 취소 건은 기간/시간이 "-"로 표시된다', async () => {
    loginAs('경찰서')
    renderPage()

    await screen.findAllByText('25-11-강남경찰서 · ST110')
    expect(withinTable().getByText('25-09-강남경찰서 · ST111')).toBeInTheDocument()
    expect(screen.queryByText(/서초경찰서/)).not.toBeInTheDocument()

    const canceledRow = withinTable().getByText('25-08-강남경찰서 · ST112').closest('tr')!
    expect(within(canceledRow).getAllByText('-').length).toBeGreaterThan(0)
  })

  it('최종상태 필터로 취소 건만 좁힐 수 있다', async () => {
    loginAs('경찰서')
    renderPage()
    await screen.findAllByText('25-11-강남경찰서 · ST110')

    fireEvent.click(screen.getByLabelText('최종상태 선택'))
    fireEvent.click(await screen.findByRole('option', { name: '취소' }))

    expect(withinTable().getByText('25-08-강남경찰서 · ST112')).toBeInTheDocument()
    expect(screen.queryByText('25-11-강남경찰서 · ST110')).not.toBeInTheDocument()
  })

  it('행을 클릭하면 이력 상세로 이동한다', async () => {
    loginAs('경찰서')
    renderPage()
    await screen.findAllByText('25-11-강남경찰서 · ST110')

    fireEvent.click(withinTable().getByText('25-11-강남경찰서 · ST110'))

    expect(await screen.findByText('이력 상세 도착')).toBeInTheDocument()
  })
})
