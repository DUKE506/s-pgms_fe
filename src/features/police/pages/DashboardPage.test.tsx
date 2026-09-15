import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('로그인한 계정명으로 인사말과 정적 요약 수치를 표시한다 (모바일 레이아웃)', () => {
    const account = login('본청')
    renderPage()

    const mobile = within(screen.getByTestId('dashboard-mobile'))
    expect(mobile.getByText(`안녕하세요, ${account.name} 담당자님`)).toBeInTheDocument()
    expect(mobile.getByText('158')).toBeInTheDocument()
    expect(mobile.getByText('상태별 현황')).toBeInTheDocument()
    expect(mobile.getByText('지역별 건수 순위')).toBeInTheDocument()
    expect(mobile.getByText('이번달 신규 접수')).toBeInTheDocument()
    expect(mobile.getByText('연령·성별 비율')).toBeInTheDocument()
    expect(mobile.getByText(/월별 추이/)).toBeInTheDocument()
    expect(mobile.getByText(/안전조치 항목별 적용률/)).toBeInTheDocument()
  })

  it('지역청/경찰서 계정으로도 렌더링된다', () => {
    login('경찰서')
    renderPage()

    expect(within(screen.getByTestId('dashboard-mobile')).getByText('상태별 현황')).toBeInTheDocument()
  })

  it('데스크톱 레이아웃도 함께 렌더링되고 좌측에 조직 트리가 노출된다', () => {
    login('본청')
    renderPage()

    const desktop = within(screen.getByTestId('dashboard-desktop'))
    expect(desktop.getByText('조직 계층')).toBeInTheDocument()
    expect(desktop.getByText('전체 (본청)')).toBeInTheDocument()
    expect(desktop.getByText('서울지방경찰청')).toBeInTheDocument()
  })

  it('모바일 조회범위 pill을 눌러 바텀시트에서 조직을 선택하면 건수가 바뀐다', async () => {
    login('본청')
    renderPage()

    expect(within(screen.getByTestId('dashboard-mobile')).getByText('158')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /전국/ }))
    const sheet = within(await screen.findByRole('dialog'))
    fireEvent.click(sheet.getByRole('button', { name: /서울지방경찰청/ }))

    expect(within(screen.getByTestId('dashboard-mobile')).getByTestId('hero-scope-count')).toHaveTextContent('41')
  })

  it('데스크톱 조직 트리에서 지방청을 고르면 히어로 건수가 바뀐다', () => {
    login('본청')
    renderPage()

    const desktop = within(screen.getByTestId('dashboard-desktop'))
    fireEvent.click(desktop.getByRole('button', { name: /부산지방청/ }))

    expect(desktop.getByTestId('hero-scope-count')).toHaveTextContent('22')
  })
})
