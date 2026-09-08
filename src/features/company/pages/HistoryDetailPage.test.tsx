import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HistoryDetailPage from './HistoryDetailPage'

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

// 본사(Stec)용 이력 상세 조회 EP가 없어(2026-09-08 실측) 목록만 연동됐다 — 상세
// 화면은 안내만 보여준다. EP가 생기면 이 테스트를 상세 렌더 검증으로 되돌린다.
describe('HistoryDetailPage (본사)', () => {
  it('상세 조회 API가 없어 준비 중 안내를 보여준다', () => {
    renderPage('46')

    expect(screen.getByText('이력 상세 조회는 준비 중입니다')).toBeInTheDocument()
    expect(
      screen.getByText('본사 이력 상세 조회 API가 아직 제공되지 않아 목록만 이용할 수 있습니다.'),
    ).toBeInTheDocument()
  })
})
