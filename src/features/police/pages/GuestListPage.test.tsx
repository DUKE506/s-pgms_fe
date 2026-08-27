import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GuestListPage from './GuestListPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/guests', element: <GuestListPage /> }], {
    initialEntries: ['/guests'],
  })
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

describe('GuestListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('소속 경찰서의 게스트 계정 6개와 조회가능 경호건을 표시한다', async () => {
    loginAsStation()
    renderPage()

    await screen.findAllByText('GangnamGuest1')
    expect(withinTable().getByText('ST101, ST102')).toBeInTheDocument()
    expect(withinTable().getByText('GangnamGuest5')).toBeInTheDocument()
    expect(withinTable().getAllByText('-').length).toBeGreaterThanOrEqual(2)
  })

  it('아이디 검색으로 목록을 좁힐 수 있다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('GangnamGuest1')

    fireEvent.change(screen.getByLabelText('아이디 검색'), { target: { value: 'Guest3' } })

    expect(withinTable().getByText('GangnamGuest3')).toBeInTheDocument()
    expect(screen.queryByText('GangnamGuest1')).not.toBeInTheDocument()
  })

  it('게스트 계정 발급 → 관리번호 선택 → 발급하면 목록에 추가된다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('GangnamGuest1')

    fireEvent.click(screen.getByRole('button', { name: /게스트 계정 발급/ }))
    const dialog = await screen.findByRole('dialog')

    fireEvent.click(within(dialog).getByText('26-01-강남경찰서 · ST101'))
    fireEvent.click(within(dialog).getByRole('button', { name: '발급하기' }))

    await waitFor(() => expect(withinTable().getByText('GangnamGuest7')).toBeInTheDocument())
    expect(withinTable().getByText('ST101')).toBeInTheDocument()
  })

  it('삭제하면 목록에서 사라진다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('GangnamGuest6')
    const row = withinTable().getByText('GangnamGuest6').closest('tr')!

    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /삭제/ }))
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }))

    await waitFor(() => expect(screen.queryByText('GangnamGuest6')).not.toBeInTheDocument())
  })
})
