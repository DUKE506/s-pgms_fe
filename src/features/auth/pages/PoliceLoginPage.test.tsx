import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import PoliceLoginPage from './PoliceLoginPage'
import DashboardStub from '../../../app/DashboardStub'
import { policeAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../store/authStore'

function renderAtRoot() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <PoliceLoginPage /> },
      { path: '/dashboard', element: <DashboardStub label="경찰" /> },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
}

describe('PoliceLoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('logs in with a valid account and navigates to the dashboard stub', async () => {
    const account = policeAccounts[0]
    renderAtRoot()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: account.id } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: account.password } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(screen.getByText('경찰 로그인 성공')).toBeInTheDocument())
    expect(useAuthStore.getState().user?.id).toBe(account.id)
    expect(useAuthStore.getState().accessToken).toBeTruthy()
  })

  it('shows an error and stays on the page for a wrong password', async () => {
    const account = policeAccounts[0]
    renderAtRoot()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: account.id } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('아이디 또는 비밀번호가 올바르지 않습니다'),
    )
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
