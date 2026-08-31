import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ManagerAccountListPage from './ManagerAccountListPage'
import { companyAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [{ path: '/admin/managers', element: <ManagerAccountListPage /> }],
    { initialEntries: ['/admin/managers'] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

function loginAs(id: string) {
  const account = companyAccounts.find((a) => a.id === id)!
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

describe('ManagerAccountListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  // 아래 테스트들은 계정 이름/비밀번호를 실제로 변경하는 테스트(파일 맨 아래)보다
  // 먼저 실행되어야 한다 — companyAccounts는 모듈 싱글톤이라 이 파일 안에서
  // 순서대로 상태를 공유한다(mocks/data/securityCases.test.ts와 같은 패턴).
  it.each([
    ['sysadmin', '시스템관리자'],
    ['opadmin', '운영관리자'],
    ['hqmanager1', '본부관리자'],
  ])('%s(%s)로 로그인해도 전체 계정(6개)을 조회할 수 있다', async (id) => {
    loginAs(id)
    renderPage()

    // 로그인 계정 자신의 이름이 아닌 다른 계정(이영희)로 대기해야 한다 — 상단
    // breadcrumb이 로그인한 계정 이름을 즉시(쿼리 로딩 전에) 표시하는데,
    // hqmanager1의 이름이 "김민수"라 그걸로 기다리면 로딩 완료를 보장 못 함.
    await screen.findAllByText('이영희')
    expect(withinTable().getByText('시스템 관리자')).toBeInTheDocument()
    expect(withinTable().getByText('운영 관리자')).toBeInTheDocument()
    expect(withinTable().getByText('김민수')).toBeInTheDocument()
    expect(withinTable().getAllByRole('row')).toHaveLength(7)
  })

  it('시스템관리자는 운영관리자의 정보수정 메뉴가 없고 비밀번호 초기화만 가능하다', async () => {
    loginAs('sysadmin')
    renderPage()
    await screen.findAllByText('운영 관리자')

    const row = withinTable().getByText('운영 관리자').closest('tr')!
    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))

    expect(screen.queryByRole('menuitem', { name: '정보수정' })).not.toBeInTheDocument()
    expect(await screen.findByRole('menuitem', { name: '비밀번호 초기화' })).toBeInTheDocument()
  })

  it('본부관리자는 본인 정보수정·비밀번호초기화가 가능하다', async () => {
    loginAs('hqmanager1')
    renderPage()
    // 본인(김민수) 이름은 breadcrumb에도 즉시 뜨므로 로딩 대기 기준으로 못 씀 —
    // 다른 계정 이름으로 대기.
    await screen.findAllByText('이영희')

    const ownRow = withinTable().getByText('김민수').closest('tr')!
    fireEvent.pointerDown(within(ownRow).getByRole('button', { name: '더보기' }))
    expect(await screen.findByRole('menuitem', { name: '정보수정' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '비밀번호 초기화' })).toBeInTheDocument()
  })

  it('본부관리자에겐 시스템관리자 행에 액션 메뉴 자체가 없다', async () => {
    loginAs('hqmanager1')
    renderPage()
    await screen.findAllByText('시스템 관리자')

    const sysadminRow = withinTable().getByText('시스템 관리자').closest('tr')!
    expect(within(sysadminRow).queryByRole('button', { name: '더보기' })).not.toBeInTheDocument()
  })

  it('본부관리자에겐 다른 본부관리자 행에도 액션 버튼 자체가 없다(배정건수는 보임)', async () => {
    loginAs('hqmanager1')
    renderPage()
    await screen.findAllByText('이영희')

    const otherManagerRow = withinTable().getByText('이영희').closest('tr')!
    expect(within(otherManagerRow).queryByRole('button', { name: '더보기' })).not.toBeInTheDocument()
    // 이영희(hqmanager2)는 경호중 건(case-seed-7) 1건을 실제로 담당 중 — 뷰어가
    // 본부관리자여도 이 숫자는 정확해야 한다(위 assignedCountFor 서버 계산 버그 수정 확인).
    expect(within(otherManagerRow).getByText('1')).toBeInTheDocument()
  })

  it('운영관리자는 본부관리자 정보수정 메뉴가 없고 비밀번호 초기화만 가능하다', async () => {
    loginAs('opadmin')
    renderPage()
    await screen.findAllByText('김민수')

    const row = withinTable().getByText('김민수').closest('tr')!
    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))

    expect(screen.queryByRole('menuitem', { name: '정보수정' })).not.toBeInTheDocument()
    expect(await screen.findByRole('menuitem', { name: '비밀번호 초기화' })).toBeInTheDocument()
  })

  it('담당경호 메뉴에서 배정된 경호건을 조회 전용으로 볼 수 있다', async () => {
    loginAs('sysadmin')
    renderPage()
    await screen.findAllByText('김민수')

    const row = withinTable().getByText('김민수').closest('tr')!
    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '담당경호' }))

    const assignedDialog = await screen.findByRole('dialog')
    expect(within(assignedDialog).getByText(/ST101/)).toBeInTheDocument()
    expect(within(assignedDialog).queryByRole('button', { name: '재배정' })).not.toBeInTheDocument()

    fireEvent.click(within(assignedDialog).getByRole('button', { name: '닫기' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('비밀번호 초기화를 실행할 수 있다', async () => {
    loginAs('sysadmin')
    renderPage()
    await screen.findAllByText('박준혁')

    const row = withinTable().getByText('박준혁').closest('tr')!
    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '비밀번호 초기화' }))
    fireEvent.click(await screen.findByRole('button', { name: '초기화' }))

    await waitFor(() =>
      expect(companyAccounts.find((a) => a.id === 'hqmanager3')!.password).toBe('hqmanager3'),
    )
  })

  // 계정 이름을 실제로 바꾸는 테스트라 파일 맨 마지막에 둔다(위 테스트들이
  // "시스템 관리자" 원래 이름에 의존하기 때문).
  it('시스템관리자는 본인 정보를 수정할 수 있다', async () => {
    loginAs('sysadmin')
    renderPage()
    // 본인(시스템 관리자) 이름은 breadcrumb에도 즉시 뜨므로 로딩 대기 기준으로
    // 못 씀 — 다른 계정 이름으로 대기.
    await screen.findAllByText('이영희')

    const row = withinTable().getByText('시스템 관리자').closest('tr')!
    fireEvent.pointerDown(within(row).getByRole('button', { name: '더보기' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '정보수정' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('이름'), { target: { value: '시스템 관리자2' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    await waitFor(() => expect(withinTable().getByText('시스템 관리자2')).toBeInTheDocument())
  })
})
