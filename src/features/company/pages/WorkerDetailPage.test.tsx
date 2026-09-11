import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WorkerDetailPage from './WorkerDetailPage'
import { companyAccounts } from '../../../mocks/data/accounts'
import { resetGuardDouble } from '../../../mocks/handlers/guard'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/admin/workers/:id', element: <WorkerDetailPage /> },
      { path: '/admin/workers', element: <div>근무자 목록</div> },
    ],
    { initialEntries: [`/admin/workers/${id}`] },
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

describe('WorkerDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    resetGuardDouble()
  })

  it('근무 이력을 경호건별 카드로 묶어 보여주고, 요약 타일은 전체 경호건을 합산한다', async () => {
    loginAsAdmin()
    renderPage('1')

    // 최근 근무한 경호건(08-08-108, 09-12 마감)이 먼저 와야 한다.
    const cards = await screen.findAllByText(/^26-0\d-(강남경찰서) · ST0(101|108)$/)
    expect(cards[0]).toHaveTextContent('26-09-강남경찰서 · ST0108')
    expect(cards[1]).toHaveTextContent('26-08-강남경찰서 · ST0101')

    // 요약 타일 = 두 경호건 합산(근무일 2+2=4, 휴무 1, 시간 13+18=31)
    expect(screen.getByText('4일')).toBeInTheDocument()
    expect(screen.getByText('31시간')).toBeInTheDocument()
    expect(screen.getByText('1일')).toBeInTheDocument()
  })

  it('카드를 클릭하면 그 경호건의 일자별 근무만 펼쳐진다', async () => {
    loginAsAdmin()
    renderPage('1')

    const card101 = await screen.findByText('26-08-강남경찰서 · ST0101')
    expect(screen.queryByText('08.20 (목)')).not.toBeInTheDocument()

    fireEvent.click(card101)

    expect(screen.getByText('08.20 (목)')).toBeInTheDocument()
    expect(screen.getByText('09:00 ~ 13:00')).toBeInTheDocument()
    // 다른 카드(108)는 계속 접혀 있어야 한다.
    expect(screen.queryByText('09.11 (금)')).not.toBeInTheDocument()

    // 다시 클릭하면 접힌다.
    fireEvent.click(card101)
    expect(screen.queryByText('08.20 (목)')).not.toBeInTheDocument()
  })

  it('근무 이력이 없는 근무자는 안내 문구를 보여준다', async () => {
    loginAsAdmin()
    renderPage('2')

    expect(await screen.findByText('근무 이력이 없습니다')).toBeInTheDocument()
    // 근무일·휴무 타일 둘 다 0일(경호건 없음).
    expect(screen.getAllByText('0일')).toHaveLength(2)
  })

  it('정보수정 버튼으로 이름·연락처를 바꾼다', async () => {
    loginAsAdmin()
    renderPage('1')
    await screen.findAllByText(/26-0\d-강남경찰서/)

    fireEvent.click(screen.getByRole('button', { name: '정보수정' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('이름'), { target: { value: '최민준2' } })
    fireEvent.change(within(dialog).getByLabelText('휴대전화번호'), {
      target: { value: '010-0000-1111' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    await waitFor(() => expect(screen.getAllByText('최민준2').length).toBeGreaterThan(0))
    expect(screen.getByText('010-0000-1111')).toBeInTheDocument()
  })

  it('삭제 버튼으로 근무자를 삭제하면 목록으로 이동한다', async () => {
    loginAsAdmin()
    renderPage('1')
    await screen.findAllByText(/26-0\d-강남경찰서/)

    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))

    expect(await screen.findByText('근무자 목록')).toBeInTheDocument()
  })
})
