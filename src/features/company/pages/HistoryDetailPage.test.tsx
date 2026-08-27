import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HistoryDetailPage from './HistoryDetailPage'
import { securityCases } from '../../../mocks/data/securityCases'
import { companyAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/admin/history/:id', element: <HistoryDetailPage /> }], {
    initialEntries: [`/admin/history/${id}`],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function loginAsAdmin() {
  const account = companyAccounts.find((a) => a.id === 'opadmin')!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
}

describe('HistoryDetailPage (본사)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('종결 건은 기본정보·근무 스케줄과 종결 정보를 조회 전용으로 보여준다', async () => {
    loginAsAdmin()
    const record = securityCases.find((c) => c.id === 'case-hist-1')!
    renderPage(record.id)

    await screen.findByText('25-11-강남경찰서 · ST110')
    expect(screen.getByText('종결 정보')).toBeInTheDocument()
    expect(screen.getByText('경호기간 만료')).toBeInTheDocument()
    expect(screen.getByText('근무 스케줄')).toBeInTheDocument()
    // 배치장소는 피해자 개인정보라 종결 이력에서도 숨긴다.
    expect(screen.queryByText('배치장소')).not.toBeInTheDocument()
    // 조회 전용 — 그룹/사전미팅 추가 컨트롤이 없어야 한다.
    expect(screen.queryByText('그룹 추가')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('사전미팅 추가')).not.toBeInTheDocument()
  })

  it('취소 건은 근무 스케줄 없이 축소된 기본정보와 취소 정보를 보여준다', async () => {
    loginAsAdmin()
    const record = securityCases.find((c) => c.id === 'case-hist-3')!
    renderPage(record.id)

    await screen.findByText('25-08-강남경찰서 · ST112')
    expect(screen.getByText('취소 정보')).toBeInTheDocument()
    expect(screen.getByText('피해자 소재불명으로 신변보호 실익 없음')).toBeInTheDocument()
    expect(screen.queryByText('근무 스케줄')).not.toBeInTheDocument()
  })
})
