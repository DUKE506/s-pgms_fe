import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import LoginPage from './LoginPage'
import { policeAccounts, companyAccounts, resetCompanyAccountPassword } from '../../../mocks/data/accounts'
import { createGuestAccount } from '../../../mocks/data/guests'
import { useAuthStore } from '../store/authStore'

function renderAtRoot(destinations: Record<string, string>) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <LoginPage /> },
      ...Object.entries(destinations).map(([path, text]) => ({ path, element: <p>{text}</p> })),
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
}

function login(id: string, password: string) {
  fireEvent.change(screen.getByLabelText('아이디'), { target: { value: id } })
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: '로그인' }))
}

// 경찰/본사 로그인 화면 통합(2026-09-11) — 계정 종류(경찰/본사/게스트)와 무관하게
// 같은 폼 하나가 login()에 넘기고 getDefaultRouteForRole로 갈리는지만 확인하면
// 되므로, 통합 전 두 화면 테스트(PoliceLoginPage/CompanyLoginPage)를 이 파일 하나로
// 합쳤다.
describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('logs in a 본청 account and navigates to /dashboard', async () => {
    const account = policeAccounts.find((a) => a.role === '본청')!
    renderAtRoot({ '/dashboard': '대시보드 도착' })

    login(account.id, account.password)

    await waitFor(() => expect(screen.getByText('대시보드 도착')).toBeInTheDocument())
    expect(useAuthStore.getState().user?.id).toBe(account.id)
    expect(useAuthStore.getState().accessToken).toBeTruthy()
  })

  it('logs in a 경찰서 account and navigates to /dashboard (2026-09-15부터 현황이 기본 랜딩)', async () => {
    const account = policeAccounts.find((a) => a.role === '경찰서')!
    renderAtRoot({ '/dashboard': '대시보드 도착' })

    login(account.id, account.password)

    await waitFor(() => expect(screen.getByText('대시보드 도착')).toBeInTheDocument())
  })

  it('logs in a company account and navigates to /admin/security-cases (대시보드 메뉴 제외로 경호관리가 기본 랜딩)', async () => {
    const account = companyAccounts[0]
    renderAtRoot({ '/admin/security-cases': '경호관리 도착' })

    login(account.id, account.password)

    await waitFor(() => expect(screen.getByText('경호관리 도착')).toBeInTheDocument())
    expect(useAuthStore.getState().user?.id).toBe(account.id)
  })

  it('shows an error and stays on the page for a wrong password', async () => {
    const account = policeAccounts[0]
    renderAtRoot({ '/dashboard': '대시보드 도착' })

    login(account.id, 'wrong-password')

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('아이디 또는 비밀번호가 올바르지 않습니다'),
    )
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('발급 직후 게스트 계정은 강제 비밀번호 변경 후 재로그인해야 한다', async () => {
    const guest = createGuestAccount('강남경찰서', [])
    renderAtRoot({ '/security-cases': '경호목록 도착' })

    login(guest.id, guest.password!)

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('새 비밀번호'), {
      target: { value: 'newpass1' },
    })
    fireEvent.change(within(dialog).getByLabelText('새 비밀번호 확인'), {
      target: { value: 'newpass1' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '변경하고 다시 로그인' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useAuthStore.getState().accessToken).toBeNull()

    login(guest.id, 'newpass1')
    await waitFor(() => expect(screen.getByText('경호목록 도착')).toBeInTheDocument())
  })

  it('강제 변경 모달에서 아이디와 같은 비밀번호는 거부된다', async () => {
    const guest = createGuestAccount('강남경찰서', [])
    renderAtRoot({ '/security-cases': '경호목록 도착' })

    login(guest.id, guest.password!)

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('새 비밀번호'), {
      target: { value: guest.id },
    })
    fireEvent.change(within(dialog).getByLabelText('새 비밀번호 확인'), {
      target: { value: guest.id },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '변경하고 다시 로그인' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '아이디와 다른 비밀번호로 설정해주세요',
    )
  })

  it('비밀번호 초기화 직후 계정은 강제 비밀번호 변경 후 재로그인해야 한다', async () => {
    const account = companyAccounts.find((a) => a.id === 'hqmanager4')!
    resetCompanyAccountPassword(account.id)
    renderAtRoot({ '/admin/security-cases': '경호관리 도착' })

    login(account.id, account.id)

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('새 비밀번호'), {
      target: { value: 'newpass1' },
    })
    fireEvent.change(within(dialog).getByLabelText('새 비밀번호 확인'), {
      target: { value: 'newpass1' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '변경하고 다시 로그인' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useAuthStore.getState().accessToken).toBeNull()

    login(account.id, 'newpass1')
    await waitFor(() => expect(screen.getByText('경호관리 도착')).toBeInTheDocument())
  })
})
