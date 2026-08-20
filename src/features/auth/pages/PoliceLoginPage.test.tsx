import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import PoliceLoginPage from './PoliceLoginPage'
import { policeAccounts } from '../../../mocks/data/accounts'
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
})
