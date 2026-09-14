import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WorkerListPage from './WorkerListPage'
import { companyAccounts } from '../../../mocks/data/accounts'
import { resetGuardDouble } from '../../../mocks/handlers/guard'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [{ path: '/admin/workers', element: <WorkerListPage /> }],
    { initialEntries: ['/admin/workers'] },
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

function tableRow(text: string) {
  const cell = withinTable().getByText(text)
  const row = cell.closest('tr')
  if (!row) throw new Error(`row for "${text}" not found`)
  return within(row)
}

describe('WorkerListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    resetGuardDouble()
  })

  it('근무자 10명을 목록에 표시한다', async () => {
    loginAsAdmin()
    renderPage()

    await screen.findAllByText('최민준')
    expect(withinTable().getByText('240231')).toBeInTheDocument()
    expect(screen.getByText('전체 10')).toBeInTheDocument()
  })

  it('이름·사번 검색으로 목록을 좁힐 수 있다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('최민준')

    fireEvent.change(screen.getByLabelText('이름 사번 검색'), { target: { value: '정우진' } })

    expect(withinTable().getByText('정우진')).toBeInTheDocument()
    expect(screen.queryByText('최민준')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('이름 사번 검색'), { target: { value: '220198' } })
    expect(withinTable().getByText('이서연')).toBeInTheDocument()
  })

  it('근무자 등록 버튼 클릭 → 폼 작성 → 등록하면 목록에 추가된다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('최민준')

    // 모바일 목업 반영(2026-09-14)으로 제목 옆에 같은 이름의 아이콘 버튼이
    // 하나 더 생겨(xl:hidden) 데스크톱 텍스트 버튼(hidden xl:flex)과 접근성
    // 이름이 겹친다 — 기존 신규접수 버튼 중복과 같은 방식으로 첫 번째를 고른다.
    fireEvent.click(screen.getAllByRole('button', { name: /근무자 등록/ })[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    const registerButton = screen.getByRole('button', { name: '등록' })
    expect(registerButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '테스트근무자' } })
    fireEvent.change(screen.getByLabelText('사번'), { target: { value: '990101' } })
    fireEvent.change(screen.getByLabelText('부서'), { target: { value: '경호4팀' } })
    fireEvent.change(screen.getByLabelText('휴대전화번호'), { target: { value: '010-9999-0000' } })

    expect(registerButton).not.toBeDisabled()
    fireEvent.click(registerButton)

    await waitFor(() => expect(screen.getByText('전체 11')).toBeInTheDocument())
    expect(withinTable().getByText('테스트근무자')).toBeInTheDocument()
  })

  it('행 메뉴 → 정보수정으로 이름·연락처를 바꾼다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('최민준')

    fireEvent.pointerDown(tableRow('최민준').getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '정보수정' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('이름'), { target: { value: '최민준2' } })
    fireEvent.change(within(dialog).getByLabelText('휴대전화번호'), { target: { value: '010-0000-1111' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    await waitFor(() => expect(withinTable().getByText('최민준2')).toBeInTheDocument())
    expect(withinTable().getByText('010-0000-1111')).toBeInTheDocument()
    expect(screen.queryByText('최민준')).not.toBeInTheDocument()
  })

  it('행 메뉴 → 삭제로 근무자를 제거한다', async () => {
    loginAsAdmin()
    renderPage()
    await screen.findAllByText('정우진')

    fireEvent.pointerDown(tableRow('정우진').getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '삭제' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(screen.getByText('전체 9')).toBeInTheDocument())
    expect(screen.queryByText('정우진')).not.toBeInTheDocument()
  })
})
