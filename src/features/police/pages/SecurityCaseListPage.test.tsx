import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SecurityCaseListPage from './SecurityCaseListPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { securityCases, requestPeriodChange } from '../../../mocks/data/securityCases'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/security-cases', element: <SecurityCaseListPage /> },
      { path: '/security-cases/new', element: <p>신규 접수 도착</p> },
      { path: '/security-cases/:id', element: <p>상세 도착</p> },
    ],
    { initialEntries: ['/security-cases'] },
  )
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

describe('PoliceSecurityCaseListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('내 경찰서 소속 건만 상태 무관하게 표시하고, 다른 경찰서 건은 제외한다', async () => {
    loginAsStation()
    renderPage()

    // 실제 백엔드는 접수 단계 관리번호의 경호코드 자리에 "접수"를 넣어 조합해 준다
    // ("26-02-강남경찰서 접수" → 화면에선 "26-02-강남경찰서 · 접수").
    await screen.findAllByText('26-02-강남경찰서 · 접수')
    expect(withinTable().getByText('26-02-강남경찰서 · 접수')).toBeInTheDocument()
    expect(withinTable().getByText('26-01-강남경찰서 · ST101')).toBeInTheDocument()
    expect(withinTable().getByText('26-03-강남경찰서 · ST102')).toBeInTheDocument()
    expect(withinTable().getByText('26-04-강남경찰서 · ST103')).toBeInTheDocument()
    expect(screen.queryByText('26-02-서초경찰서')).not.toBeInTheDocument()
  })

  it('상태 칩으로 목록을 좁힐 수 있다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('26-01-강남경찰서 · ST101')

    fireEvent.click(screen.getByRole('button', { name: '배정 1' }))

    expect(withinTable().getByText('26-01-강남경찰서 · ST101')).toBeInTheDocument()
    expect(screen.queryByText('26-03-강남경찰서 · ST102')).not.toBeInTheDocument()
  })

  it('행을 클릭하면 해당 경호건 상세로 이동한다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('26-03-강남경찰서 · ST102')

    fireEvent.click(withinTable().getByText('26-03-강남경찰서 · ST102'))

    expect(await screen.findByText('상세 도착')).toBeInTheDocument()
  })

  it('신규 접수 버튼을 누르면 접수 화면으로 이동한다', async () => {
    loginAsStation()
    renderPage()
    await screen.findAllByText('26-02-강남경찰서 · 접수')

    fireEvent.click(screen.getByRole('button', { name: '신규 접수' }))

    expect(await screen.findByText('신규 접수 도착')).toBeInTheDocument()
  })

  it('배치 종료가 임박한(remainDays≤2) 경호중 건은 행/카드가 강조되고 D-day 배지가 뜬다', async () => {
    loginAsStation()
    // case-seed-7(경호중, ST102)의 종료일을 내일로 당겨 remainDays=1을 재현.
    const record = securityCases.find((c) => c.id === 'case-seed-7')!
    const originalEndDate = record.endDate
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    record.endDate = tomorrow.toISOString().slice(0, 10)
    try {
      renderPage()
      await screen.findAllByText('26-03-강남경찰서 · ST102')
      const row = withinTable().getByText('26-03-강남경찰서 · ST102').closest('tr')!
      expect(within(row).getByText('D-1')).toBeInTheDocument()
      expect(row.className).toContain('bg-destructive/10')
    } finally {
      record.endDate = originalEndDate
    }
  })

  it('경호중이 아니면 remainDays가 낮아도 강조하지 않는다', async () => {
    loginAsStation()
    // case-seed-8(경호완료, ST103)의 종료일을 내일로 당겨도 — 이미 끝난 배치라
    // "임박"이 의미 없어 하이라이트 대상에서 제외된다(사용자 확인).
    const record = securityCases.find((c) => c.id === 'case-seed-8')!
    const originalEndDate = record.endDate
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    record.endDate = tomorrow.toISOString().slice(0, 10)
    try {
      renderPage()
      await screen.findAllByText('26-04-강남경찰서 · ST103')
      const row = withinTable().getByText('26-04-강남경찰서 · ST103').closest('tr')!
      expect(within(row).queryByText('D-1')).not.toBeInTheDocument()
      expect(row.className).not.toContain('bg-destructive/10')
    } finally {
      record.endDate = originalEndDate
    }
  })

  it('연장/단축 신청 대기 중인 경호중 건도 목록에서 사라지지 않는다', async () => {
    loginAsStation()
    // 경호중 건에 단축 신청 → 실백엔드는 GetDeployList.statusName을 "단축"으로 준다
    // (findings #19). 경호중으로 정규화하지 않으면 VISIBLE_STATUSES 필터에 걸려 사라진다.
    const record = securityCases.find((c) => c.id === 'case-seed-7')!
    requestPeriodChange(record.id, '단축', record.endDate)
    try {
      renderPage()
      await screen.findAllByText('26-03-강남경찰서 · ST102')
      const row = withinTable().getByText('26-03-강남경찰서 · ST102').closest('tr')!
      expect(within(row).getByText('경호중')).toBeInTheDocument()
    } finally {
      record.pendingPeriodRequest = undefined
    }
  })
})
