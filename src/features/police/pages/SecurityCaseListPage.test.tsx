import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SecurityCaseListPage from './SecurityCaseListPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/security-cases', element: <SecurityCaseListPage /> },
      { path: '/security-cases/new', element: <p>신규 접수 도착</p> },
      { path: '/security-cases/:id', element: <p>상세 도착</p> },
    ],
    { initialEntries: ['/security-cases'] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function loginAsStation() {
  const account = policeAccounts.find((a) => a.role === '경찰서')!
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

describe('PoliceSecurityCaseListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('내 경찰서 소속 건만 상태 무관하게 표시하고, 다른 경찰서 건은 제외한다', async () => {
    loginAsStation()
    renderPage()

    await screen.findAllByText('26-02-강남경찰서')
    expect(withinTable().getByText('26-02-강남경찰서')).toBeInTheDocument()
    expect(withinTable().getByText('26-01-강남경찰서 · ST101')).toBeInTheDocument()
    expect(withinTable().getByText('26-03-강남경찰서 · ST102')).toBeInTheDocument()
    expect(withinTable().getByText('26-04-강남경찰서 · ST103')).toBeInTheDocument()
    expect(screen.queryByText('26-02-서초경찰서')).not.toBeInTheDocument()
  })

  it('상태 칩으로 목록을 좁힐 수 있다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('26-01-강남경찰서 · ST101')

    fireEvent.click(screen.getByRole('button', { name: '배정 1' }))

    expect(withinTable().getByText('26-01-강남경찰서 · ST101')).toBeInTheDocument()
    expect(screen.queryByText('26-03-강남경찰서 · ST102')).not.toBeInTheDocument()
  })

  it('행을 클릭하면 해당 경호건 상세로 이동한다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('26-03-강남경찰서 · ST102')

    fireEvent.click(withinTable().getByText('26-03-강남경찰서 · ST102'))

    expect(await screen.findByText('상세 도착')).toBeInTheDocument()
  })

  it('신규 접수 버튼을 누르면 접수 화면으로 이동한다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('26-02-강남경찰서')

    fireEvent.click(screen.getByRole('button', { name: '신규 접수' }))

    expect(await screen.findByText('신규 접수 도착')).toBeInTheDocument()
  })
})
