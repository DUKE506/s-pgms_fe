import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountManagementPage from './AccountManagementPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { findAccountByUserSeq } from '../../../mocks/data/policeAccountTree'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [{ path: '/accounts', element: <AccountManagementPage /> }],
    { initialEntries: ['/accounts'] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function loginAs(id: string) {
  const account = policeAccounts.find((a) => a.id === id)!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
}

function withinTable() {
  return within(screen.getByRole('table'))
}

describe('AccountManagementPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('본청으로 로그인하면 전국 계정(6개)을 조회할 수 있다', async () => {
    loginAs('hq')
    renderPage()

    await screen.findAllByText('강남경찰서')
    expect(withinTable().getByText('본청 관리자')).toBeInTheDocument()
    expect(withinTable().getByText('서울경찰청')).toBeInTheDocument()
    expect(withinTable().getByText('경기지역청')).toBeInTheDocument()
    expect(withinTable().getByText('수원경찰서')).toBeInTheDocument()
    // 서초경찰서는 userInfo가 null이라(계정 없음) 행에 나오지 않는다.
    expect(withinTable().queryByText('서초경찰서')).not.toBeInTheDocument()
    expect(withinTable().getAllByRole('row')).toHaveLength(7) // 헤더 1 + 계정 6
  })

  it('지역청으로 로그인하면 관할 이하만 조회된다', async () => {
    loginAs('gyeonggi')
    renderPage()

    // 로그인 계정 자신의 이름(경기지역청)이 아닌 다른 텍스트로 대기해야 한다 —
    // 상단 헤더가 로그인 계정 이름을 쿼리 로딩 전부터 즉시 보여준다.
    await screen.findAllByText('수원경찰서')
    expect(withinTable().getByText('수원경찰서')).toBeInTheDocument()
    expect(withinTable().queryByText('강남경찰서')).not.toBeInTheDocument()
    expect(withinTable().getAllByRole('row')).toHaveLength(3) // 헤더 1 + 계정 2
  })

  it('비밀번호 초기화를 실행할 수 있다', async () => {
    loginAs('hq')
    renderPage()
    await screen.findAllByText('강남경찰서')

    const row = withinTable().getByText('강남경찰서').closest('tr')!
    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '비밀번호 초기화' }))
    fireEvent.click(await screen.findByRole('button', { name: '초기화' }))

    await waitFor(() => expect(findAccountByUserSeq(53)?.pwChangedYn).toBe(true))
  })
})
