import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import PoliceLoginPage from './PoliceLoginPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { createGuestAccount } from '../../../mocks/data/guests'
import { useAuthStore } from '../store/authStore'

function renderAtRoot(destinations: Record<string, string>) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <PoliceLoginPage /> },
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

describe('PoliceLoginPage', () => {
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

  it('logs in a 경찰서 account and navigates to /security-cases (not /dashboard)', async () => {
    const account = policeAccounts.find((a) => a.role === '경찰서')!
    renderAtRoot({ '/security-cases': '경호목록 도착' })

    login(account.id, account.password)

    await waitFor(() => expect(screen.getByText('경호목록 도착')).toBeInTheDocument())
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
})
