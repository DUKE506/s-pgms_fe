import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import CompanyLoginPage from './CompanyLoginPage'
import { companyAccounts, resetCompanyAccountPassword } from '../../../mocks/data/accounts'
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

  it('비밀번호 초기화 직후 계정은 강제 비밀번호 변경 후 재로그인해야 한다', async () => {
    const account = companyAccounts.find((a) => a.id === 'hqmanager4')!
    resetCompanyAccountPassword(account.id)
    renderAtRoot()

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: account.id } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: account.id } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

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

    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: account.id } })
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'newpass1' } })
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(screen.getByText('대시보드 도착')).toBeInTheDocument())
  })
})
