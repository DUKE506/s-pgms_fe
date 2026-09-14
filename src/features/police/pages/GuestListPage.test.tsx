import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GuestListPage from './GuestListPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/guests', element: <GuestListPage /> }], {
    initialEntries: ['/guests'],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function loginAsStation() {
  const account = policeAccounts.find((a) => a.role === '경찰서')!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
  return account
}

function withinTable() {
  return within(screen.getByRole('table'))
}

describe('GuestListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('소속 경찰서의 게스트 계정 6개와 조회가능 경호건을 표시한다', async () => {
    loginAsStation()
    renderPage()

    await screen.findAllByText('GangnamGuest1')
    expect(withinTable().getByText('ST101, ST102')).toBeInTheDocument()
    expect(withinTable().getByText('GangnamGuest5')).toBeInTheDocument()
    expect(withinTable().getAllByText('경호건 없음').length).toBeGreaterThanOrEqual(2)
  })

  it('아이디 검색으로 목록을 좁힐 수 있다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('GangnamGuest1')

    fireEvent.change(screen.getByLabelText('아이디 검색'), { target: { value: 'Guest3' } })

    expect(withinTable().getByText('GangnamGuest3')).toBeInTheDocument()
    expect(screen.queryByText('GangnamGuest1')).not.toBeInTheDocument()
  })

  it('게스트 계정 발급 → 관리번호 선택 → 발급하면 목록에 추가된다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('GangnamGuest1')

    // 모바일 목업 반영(2026-09-14)으로 제목 옆에 같은 이름의 아이콘 버튼이
    // 하나 더 생겨(xl:hidden) 데스크톱 텍스트 버튼(hidden xl:flex)과 접근성
    // 이름이 겹친다 — 기존 신규접수 버튼 중복과 같은 방식으로 첫 번째를 고른다.
    fireEvent.click(screen.getAllByRole('button', { name: /게스트 계정 발급/ })[0])
    const dialog = await screen.findByRole('dialog')

    // 다이얼로그가 발급 후보(GetGuestCaseList)를 직접 조회하므로 로드를 기다린다.
    fireEvent.click(await within(dialog).findByText('26-01-강남경찰서 · ST101'))
    fireEvent.click(within(dialog).getByRole('button', { name: '발급하기' }))

    await waitFor(() => expect(withinTable().getByText('GangnamGuest7')).toBeInTheDocument())
    expect(withinTable().getByText('ST101')).toBeInTheDocument()
  })

  it('발급 시 비고를 입력하면 목록에 표시되고, 수정으로 값을 바꿀 수 있다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('GangnamGuest1')

    // 모바일 목업 반영(2026-09-14)으로 제목 옆에 같은 이름의 아이콘 버튼이
    // 하나 더 생겨(xl:hidden) 데스크톱 텍스트 버튼(hidden xl:flex)과 접근성
    // 이름이 겹친다 — 기존 신규접수 버튼 중복과 같은 방식으로 첫 번째를 고른다.
    fireEvent.click(screen.getAllByRole('button', { name: /게스트 계정 발급/ })[0])
    const issueDialog = await screen.findByRole('dialog')
    await within(issueDialog).findByText('26-01-강남경찰서 · ST101')
    fireEvent.change(within(issueDialog).getByLabelText('비고'), {
      target: { value: '강력팀 협조' },
    })
    fireEvent.click(within(issueDialog).getByRole('button', { name: '발급하기' }))

    // 방금 만든 계정의 이름(번호)은 이 파일 안 다른 테스트 실행 순서에 따라
    // 달라질 수 있어(같은 경찰서 시퀀스 공유) 이름 대신 비고 텍스트로 행을 찾는다.
    await waitFor(() => expect(withinTable().getByText('강력팀 협조')).toBeInTheDocument())
    const row = withinTable().getByText('강력팀 협조').closest('tr')!
    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '수정' }))
    const editDialog = await screen.findByRole('dialog')
    const memoInput = await within(editDialog).findByLabelText('비고')
    expect(memoInput).toHaveValue('강력팀 협조')
    fireEvent.change(memoInput, { target: { value: '강력팀 협조 종료' } })
    fireEvent.click(within(editDialog).getByRole('button', { name: '저장' }))

    await waitFor(() => expect(withinTable().getByText('강력팀 협조 종료')).toBeInTheDocument())
  })

  it('삭제하면 목록에서 사라진다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('GangnamGuest6')
    const row = withinTable().getByText('GangnamGuest6').closest('tr')!

    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /삭제/ }))
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }))

    await waitFor(() => expect(screen.queryByText('GangnamGuest6')).not.toBeInTheDocument())
  })
})
