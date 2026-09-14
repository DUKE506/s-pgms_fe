import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import DashboardPage from './DashboardPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const router = createMemoryRouter([{ path: '/dashboard', element: <DashboardPage /> }], {
    initialEntries: ['/dashboard'],
  })
  render(<RouterProvider router={router} />)
}

function login(role: '본청' | '지역청' | '경찰서') {
  const account = policeAccounts.find((a) => a.role === role)!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
  return account
}

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('로그인한 계정명으로 인사말과 정적 요약 수치를 표시한다', () => {
    const account = login('본청')
    renderPage()

    expect(screen.getByText(`안녕하세요, ${account.name} 담당자님`)).toBeInTheDocument()
    expect(screen.getByText('158')).toBeInTheDocument()
    expect(screen.getByText('상태별 현황')).toBeInTheDocument()
    expect(screen.getByText('지역별 건수 순위')).toBeInTheDocument()
    expect(screen.getByText('이번달 신규 접수')).toBeInTheDocument()
    expect(screen.getByText('상태별 비율')).toBeInTheDocument()
  })

  it('지역청/경찰서 계정으로도 렌더링된다', () => {
    login('경찰서')
    renderPage()

    expect(screen.getByText('상태별 현황')).toBeInTheDocument()
  })
})
