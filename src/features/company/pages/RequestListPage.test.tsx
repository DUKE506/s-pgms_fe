import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RequestListPage from './RequestListPage'
import { companyAccounts } from '../../../mocks/data/accounts'
import { securityCases } from '../../../mocks/data/securityCases'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/admin/requests', element: <RequestListPage /> },
      { path: '/admin/security-cases', element: <p>경호목록 도착</p> },
    ],
    { initialEntries: ['/admin/requests'] },
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
  return account
}

// 데스크톱 테이블 + 모바일 카드 리스트가 항상 같이 렌더링되고(반응형은 CSS로만
// 감춤), jsdom은 CSS를 계산하지 않아 둘 다 보이므로 테이블 쪽으로 범위를 좁혀 조회한다.
function withinTable() {
  return within(screen.getByRole('table'))
}

describe('RequestListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('접수 상태 배치요청 5건을 목록에 표시한다', async () => {
    loginAsAdmin()
    renderPage()

    await screen.findAllByText('26-02-강남경찰서')
    expect(withinTable().getByText('26-02-강남경찰서')).toBeInTheDocument()
    expect(screen.getByText('배치요청 5')).toBeInTheDocument()
    expect(withinTable().getAllByRole('button', { name: '더보기' })).toHaveLength(5)
  })

  it('관리번호 검색으로 목록을 좁힐 수 있다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('26-02-강남경찰서')

    fireEvent.change(screen.getByLabelText('관리번호 검색'), { target: { value: '서초' } })

    expect(withinTable().getByText('26-02-서초경찰서')).toBeInTheDocument()
    expect(screen.queryByText('26-02-강남경찰서')).not.toBeInTheDocument()
  })

  it('더보기 메뉴 → 배정 선택 → 담당자 선택 → 배정하기까지 완료하면 목록에서 사라진다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('26-02-강남경찰서')
    const gangnamRow = withinTable().getByText('26-02-강남경찰서').closest('tr')!

    fireEvent.pointerDown(within(gangnamRow).getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '배정' }))

    expect(await screen.findByText('담당자 배정')).toBeInTheDocument()
    expect(screen.getByText(/김민수 본부관리자/)).toBeInTheDocument()

    fireEvent.click(screen.getByText(/김민수 본부관리자/))
    fireEvent.click(screen.getByRole('button', { name: '배정하기' }))

    await waitFor(() => expect(screen.queryByText('26-02-강남경찰서')).not.toBeInTheDocument())
    expect(screen.getByText('배치요청 4')).toBeInTheDocument()

    const assigned = securityCases.find((c) => c.receiptNumber === '26-02-강남경찰서')!
    expect(assigned.status).toBe('배정')
    expect(assigned.assigneeId).toBe('hqmanager1')
    expect(assigned.securityCode).toMatch(/^ST\d{3}$/)
  })

  it('행을 클릭하면 배치요구서 모달이 뜬다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('26-02-분당경찰서')

    fireEvent.click(withinTable().getByText('26-02-분당경찰서'))

    // GetDeployRequestList는 목록 필드(관리번호·경찰서·기간)만 주고 배치요구서
    // 원본은 안 준다(본사가 볼 API 없음, issues #7) — 다이얼로그는 그 필드만 표시.
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('배치요구서')).toBeInTheDocument()
    expect(within(dialog).getByText(/분당경찰서/)).toBeInTheDocument()
  })

  it('취소 메뉴로 접수취소하면 해당 배치요청이 목록에서 사라진다', async () => {
    loginAsAdmin()
    // 다른 테스트에 영향 없도록 전용 접수 건을 추가한다.
    const base = securityCases.find((c) => c.receiptNumber === '26-02-서초경찰서')!
    // 고유한 숫자부(deploySeqOf 규칙)를 갖도록 id를 숫자 접미사로 둔다.
    securityCases.push({
      ...base,
      id: 'case-90007',
      receiptNumber: '26-08-테스트경찰서',
    })
    renderPage()
    await screen.findAllByText('26-08-테스트경찰서')
    const row = withinTable().getByText('26-08-테스트경찰서').closest('tr')!

    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))
    const cancelItem = await screen.findByRole('menuitem', { name: '취소' })
    expect(cancelItem).not.toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(cancelItem)

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '접수취소' }))

    await waitFor(() =>
      expect(screen.queryByText('26-08-테스트경찰서')).not.toBeInTheDocument(),
    )
    expect(securityCases.find((c) => c.id === 'case-90007')).toBeUndefined()
  })
})
