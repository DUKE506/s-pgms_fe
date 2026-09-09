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
  const router = createMemoryRouter(
    [
      { path: '/admin/history/:id', element: <HistoryDetailPage /> },
      { path: '/admin/history', element: <p>이력 목록 도착</p> },
    ],
    { initialEntries: [`/admin/history/${id}`] },
  )
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

// 화면 13: 본사 이력 상세 — History/Stec/W/GetHistoryDetail(2026-09-09 신설) 연동.
describe('HistoryDetailPage (본사)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('종결 건은 근무자 배정 이력과 종결 정보를 보여준다', async () => {
    loginAsAdmin()
    const record = securityCases.find((c) => c.id === 'case-hist-1')!
    renderPage(record.id)

    await screen.findByText('25-11-강남경찰서 · ST110')
    expect(screen.getByText('종결 정보')).toBeInTheDocument()
    expect(screen.getByText('경호기간 만료')).toBeInTheDocument()
    expect(screen.getByText('최민준')).toBeInTheDocument()
  })

  it('취소 건은 근무자 배정 이력 없이 취소 정보를 보여준다', async () => {
    loginAsAdmin()
    const record = securityCases.find((c) => c.id === 'case-hist-3')!
    renderPage(record.id)

    await screen.findByText('25-08-강남경찰서 · ST112')
    expect(screen.getByText('취소 정보')).toBeInTheDocument()
    expect(screen.getByText('배정된 근무자가 없습니다')).toBeInTheDocument()
  })

  it('범위 밖(없는) caseSeq는 오류 안내를 보여준다', async () => {
    loginAsAdmin()
    renderPage('999999')

    expect(await screen.findByText('이력을 불러오지 못했습니다')).toBeInTheDocument()
  })
})
