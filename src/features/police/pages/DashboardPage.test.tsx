import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from './DashboardPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/dashboard', element: <DashboardPage /> }], {
    initialEntries: ['/dashboard'],
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
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

// 데이터 로딩(react-query)이 끝나 실제 레이아웃(mobile/desktop 컨테이너)이 뜰 때까지
// 기다린 뒤 그 안에서 조회하는 within 스코프를 돌려준다.
async function findScope(testId: 'dashboard-mobile' | 'dashboard-desktop') {
  return within(await screen.findByTestId(testId))
}

// 트리 행 버튼 텍스트("서울지방경찰청 41건")에서 건수만 뽑는다 — mock 집계값을
// 테스트에 하드코딩하지 않고 화면에 실제로 그려진 값을 그대로 신뢰하기 위함.
function countFromButtonText(text: string): string {
  return text.match(/(\d+)건/)?.[1] ?? ''
}

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('로그인한 계정명으로 인사말을 표시하고 실 API 집계 카드가 뜬다 (모바일 레이아웃, 본청)', async () => {
    const account = login('본청')
    renderPage()

    const mobile = await findScope('dashboard-mobile')
    expect(mobile.getByText(`안녕하세요, ${account.name} 담당자님`)).toBeInTheDocument()
    expect(mobile.getByText('상태별 현황')).toBeInTheDocument()
    expect(mobile.getByText('지역별 건수 순위')).toBeInTheDocument()
    expect(mobile.getByText('이번달 신규 접수')).toBeInTheDocument()
    expect(mobile.getByText('연령·성별 비율')).toBeInTheDocument()
    expect(mobile.getByText(/월별 추이/)).toBeInTheDocument()
    expect(mobile.getByText(/안전조치 항목별 적용률/)).toBeInTheDocument()
  })

  it('경찰서 계정은 지역별 건수 순위 섹션이 빠지고 그 자리를 접수 월별 추이가 대신한다 (모바일)', async () => {
    login('경찰서')
    renderPage()

    const mobile = await findScope('dashboard-mobile')
    expect(mobile.getByText('상태별 현황')).toBeInTheDocument()
    expect(mobile.queryByText('지역별 건수 순위')).not.toBeInTheDocument()
    // 접수 월별 추이는 한 번만(별도 재배치 행 없음).
    expect(mobile.getAllByText(/월별 추이/)).toHaveLength(1)
  })

  it('경찰서 계정은 데스크톱에서도 지역별 건수 순위 대신 접수 월별 추이가 그 자리에 들어간다', async () => {
    login('경찰서')
    renderPage()

    const desktop = await findScope('dashboard-desktop')
    expect(desktop.getByText('이번달 신규 접수')).toBeInTheDocument()
    expect(desktop.queryByText('지역별 건수 순위')).not.toBeInTheDocument()
    expect(desktop.getAllByText(/월별 추이/)).toHaveLength(1)
  })

  it('본청 계정은 데스크톱 레이아웃에 좌측 조직 트리와 지역별 건수 순위 + 별도 월별 추이가 함께 뜬다', async () => {
    login('본청')
    renderPage()

    const desktop = await findScope('dashboard-desktop')
    expect(desktop.getByText('조직 계층')).toBeInTheDocument()
    expect(desktop.getByText('이번달 신규 접수')).toBeInTheDocument()
    expect(desktop.getByText('서울지방경찰청')).toBeInTheDocument()
    expect(desktop.getByText('지역별 건수 순위')).toBeInTheDocument()
    expect(desktop.getAllByText(/월별 추이/)).toHaveLength(1)
  })

  it('데스크톱 조직 트리에서 지방청을 고르면 히어로 건수가 그 조직 건수로 바뀐다', async () => {
    login('본청')
    renderPage()

    const desktop = await findScope('dashboard-desktop')
    const regionButton = desktop.getByRole('button', { name: /서울지방경찰청/ })
    const expectedCount = countFromButtonText(regionButton.textContent ?? '')

    fireEvent.click(regionButton)

    await waitFor(() => expect(desktop.getByTestId('hero-scope-count')).toHaveTextContent(expectedCount))
  })

  it('모바일 조회범위 pill을 눌러 바텀시트에서 조직을 선택하면 건수가 바뀐다', async () => {
    login('본청')
    renderPage()

    const mobile = await findScope('dashboard-mobile')
    fireEvent.click(mobile.getByRole('button', { name: /전국/ }))
    const sheet = within(await screen.findByRole('dialog'))
    const regionButton = sheet.getByRole('button', { name: /서울지방경찰청/ })
    const expectedCount = countFromButtonText(regionButton.textContent ?? '')
    fireEvent.click(regionButton)

    await waitFor(() => expect(mobile.getByTestId('hero-scope-count')).toHaveTextContent(expectedCount))
  })
})
