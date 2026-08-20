import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import CompanyLoginPage from './CompanyLoginPage'
import { companyAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../store/authStore'

function renderAtRoot() {
  const router = createMemoryRouter(
    [
      { path: '/admin', element: <CompanyLoginPage /> },
      { path: '/admin/dashboard', element: <p>대시보드 도착</p> },
    ],
    { initialEntries: ['/admin'] },
  )
  render(<RouterProvider router={router} />)
}

describe('CompanyLoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('logs in with a valid account and navigates to /admin/dashboard', async () => {
    const account = companyAccounts[0]
    renderAtRoot()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: account.id } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: account.password } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(screen.getByText('대시보드 도착')).toBeInTheDocument())
    expect(useAuthStore.getState().user?.id).toBe(account.id)
  })

  it('shows an error and stays on the page for a wrong password', async () => {
    const account = companyAccounts[0]
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
