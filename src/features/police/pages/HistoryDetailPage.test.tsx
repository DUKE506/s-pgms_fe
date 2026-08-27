import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HistoryDetailPage from './HistoryDetailPage'
import { securityCases } from '../../../mocks/data/securityCases'
import { policeAccounts, type Account } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/history/:id', element: <HistoryDetailPage /> }], {
    initialEntries: [`/history/${id}`],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function loginAs(role: Account['role']) {
  const account = policeAccounts.find((a) => a.role === role)!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
}

describe('HistoryDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('종결 건은 근무자 배정 이력과 종결 정보를 보여준다', async () => {
    loginAs('경찰서')
    const record = securityCases.find((c) => c.id === 'case-hist-1')!
    renderPage(record.id)

    await screen.findByText('25-11-강남경찰서 · ST110')
    expect(screen.getByText('종결 정보')).toBeInTheDocument()
    expect(screen.getByText('경호기간 만료')).toBeInTheDocument()
    expect(screen.getByText('최민준')).toBeInTheDocument()
  })

  it('취소 건은 근무자 배정 이력 없이 취소 정보를 보여준다', async () => {
    loginAs('경찰서')
    const record = securityCases.find((c) => c.id === 'case-hist-3')!
    renderPage(record.id)

    await screen.findByText('25-08-강남경찰서 · ST112')
    expect(screen.getByText('취소 정보')).toBeInTheDocument()
    expect(screen.getByText('피해자 소재불명으로 신변보호 실익 없음')).toBeInTheDocument()
    expect(screen.getByText('배정된 근무자가 없습니다')).toBeInTheDocument()
  })
})
