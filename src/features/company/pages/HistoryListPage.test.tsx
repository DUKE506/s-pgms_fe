import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HistoryListPage from './HistoryListPage'
import { companyAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/admin/history', element: <HistoryListPage /> },
      { path: '/admin/history/:id', element: <p>이력 상세 도착</p> },
    ],
    { initialEntries: ['/admin/history'] },
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

function withinTable() {
  return within(screen.getByRole('table'))
}

describe('HistoryListPage (본사)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('스코프 제한 없이 전국 종결/취소 건을 조회한다', async () => {
    loginAsAdmin()
    renderPage()

    await screen.findAllByText('25-11-강남경찰서 · ST110')
    expect(withinTable().getByText('25-11-강남경찰서 · ST110')).toBeInTheDocument()
    expect(withinTable().getByText('25-07-분당경찰서 · ST114')).toBeInTheDocument()
    expect(withinTable().getByText('25-05-부산진경찰서 · ST116')).toBeInTheDocument()
  })

  it('진행중 건은 목록에 없다(경호목록 화면 소관)', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('25-11-강남경찰서 · ST110')

    expect(screen.queryByText('26-01-강남경찰서 · ST101')).not.toBeInTheDocument()
  })

  it('최종상태 필터로 취소 건만 좁힐 수 있다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('25-11-강남경찰서 · ST110')

    fireEvent.click(screen.getByLabelText('최종상태 선택'))
    fireEvent.click(await screen.findByRole('option', { name: '취소' }))

    expect(withinTable().getByText('25-08-강남경찰서 · ST112')).toBeInTheDocument()
    expect(screen.queryByText('25-11-강남경찰서 · ST110')).not.toBeInTheDocument()
  })

  it('취소 건은 경호기간/총경호시간이 "-"로 표시된다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('25-11-강남경찰서 · ST110')

    const canceledRow = withinTable().getByText('25-08-강남경찰서 · ST112').closest('tr')!
    expect(within(canceledRow).getAllByText('-').length).toBeGreaterThan(0)
  })

  it('행을 클릭하면 이력 상세로 이동한다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('25-11-강남경찰서 · ST110')

    fireEvent.click(withinTable().getByText('25-11-강남경찰서 · ST110'))

    expect(await screen.findByText('이력 상세 도착')).toBeInTheDocument()
  })
})
