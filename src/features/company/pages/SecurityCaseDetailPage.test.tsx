import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SecurityCaseDetailPage from './SecurityCaseDetailPage'
import { companyAccounts } from '../../../mocks/data/accounts'
import { assignManager, requestPeriodChange, securityCases } from '../../../mocks/data/securityCases'
import { useAuthStore } from '../../auth/store/authStore'

function renderPage(caseId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [{ path: '/admin/security-cases/:id', element: <SecurityCaseDetailPage /> }],
    { initialEntries: [`/admin/security-cases/${caseId}`] },
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

function loginAs(accountId: string) {
  const account = companyAccounts.find((a) => a.id === accountId)!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
}

// 접수 상태 케이스를 하나 배정해서(경호코드 발급) 상세 화면 테스트용 대상으로 삼는다.
function assignedCaseId(): string {
  const record = securityCases.find((c) => c.status === '접수')!
  assignManager(record.id, 'hqmanager1')
  return record.id
}

describe('SecurityCaseDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('경호계획서 정보 등록 → 스케줄 생성 → 그룹 수정까지 전체 흐름이 동작한다', async () => {
    loginAsAdmin()
    const caseId = assignedCaseId()
    renderPage(caseId)
    await screen.findByText('경호계획서 정보가 등록되지 않았습니다')

    // 1) 경호계획서 정보 등록: 근무자 2명 추가, 첫 번째만 대표근무자로 지정
    fireEvent.click(screen.getByRole('button', { name: /경호계획서 정보 등록/ }))
    await screen.findByText('1. 경호대상자')

    fireEvent.click(screen.getByRole('button', { name: '근무자 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '근무자 추가' }))
    fireEvent.click(screen.getByRole('button', { name: '근무자 1 대표근무자로 지정' }))

    fireEvent.click(screen.getByRole('button', { name: '등록' }))
    await screen.findByText('등록된 근무 스케줄이 없습니다')

    const updatedCase = securityCases.find((c) => c.id === caseId)!
    expect(updatedCase.baseInfo?.defaultWorkers).toHaveLength(2)
    expect(updatedCase.baseInfo?.defaultWorkers.filter((w) => w.isDefault)).toHaveLength(1)

    // 2) 근무 스케줄 생성 — 배치기간 내 일자별 그룹 1이 대표근무자로 자동 생성된다
    fireEvent.click(screen.getByRole('button', { name: '스케줄 정보 입력' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await screen.findByText('사전미팅')

    const withSchedule = securityCases.find((c) => c.id === caseId)!
    const firstDay = withSchedule.workSchedule!.days[0]
    expect(firstDay.groups).toHaveLength(1)
    expect(firstDay.groups[0].assignments).toHaveLength(1)
    expect(firstDay.groups[0].assignments[0].isOff).toBe(false)

    // 3) 첫 일자의 그룹을 열어 시간을 수정하고 저장
    fireEvent.click(screen.getByRole('button', { name: '그룹 1 수정' }))
    await screen.findByText('그룹 추가/수정')

    fireEvent.click(screen.getByLabelText('근무자 1 시작시간 시'))
    fireEvent.click(await screen.findByRole('option', { name: '10시' }))
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      const saved = securityCases.find((c) => c.id === caseId)!
      expect(saved.workSchedule!.days[0].groups[0].assignments[0].startTime).toBe('10:00')
    })

    // 4) 첫 일자에 그룹을 추가했다가 삭제 — 그룹1은 삭제 버튼이 없고, 추가된 그룹2만 삭제된다
    fireEvent.click(screen.getAllByRole('button', { name: '그룹 추가' })[0])
    await screen.findByText('그룹 추가/수정')
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => {
      const twoGroups = securityCases.find((c) => c.id === caseId)!
      expect(twoGroups.workSchedule!.days[0].groups).toHaveLength(2)
    })

    // 그룹1 수정 모달엔 삭제 버튼이 없다
    fireEvent.click(screen.getByRole('button', { name: '그룹 1 수정' }))
    await screen.findByText('그룹 추가/수정')
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    // 그룹2 수정 모달에서 삭제
    fireEvent.click(screen.getByRole('button', { name: '그룹 2 수정' }))
    await screen.findByText('그룹 추가/수정')
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => {
      const oneGroup = securityCases.find((c) => c.id === caseId)!
      expect(oneGroup.workSchedule!.days[0].groups).toHaveLength(1)
    })
  })

  it('본부관리자는 본인이 담당하는 건은 상세를 조회할 수 있다', async () => {
    // case-seed-6은 김민수(hqmanager1) 담당으로 seed돼 있다.
    loginAs('hqmanager1')
    renderPage('case-seed-6')

    expect(await screen.findByText('경호계획서 정보가 등록되지 않았습니다')).toBeInTheDocument()
  })

  it('담당자가 아닌 본부관리자는 상세 조회가 거부된다', async () => {
    // case-seed-6 담당자는 김민수 — 이영희(hqmanager2)는 담당자가 아니다.
    loginAs('hqmanager2')
    renderPage('case-seed-6')

    expect(
      await screen.findByText('조회 권한이 없거나 존재하지 않는 경호건입니다'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '뒤로가기' })).toBeInTheDocument()
  })

  it('연장/단축 요청이 대기 중이면 상태뱃지 옆에 안내 문구가 뜬다', async () => {
    // case-seed-7(경호중, 26-03-강남경찰서)에 연장 요청을 걸어 실백엔드가
    // statusName을 "연장"으로 주는 상황을 재현(findings #19와 같은 문제,
    // 경찰이 연장·단축을 요청해도 본사가 탭에 안 들어가면 알 방법이 없어
    // 상세 배지 옆에 바로 노출 — 사용자 요청, 2026-09-11).
    loginAsAdmin()
    const record = securityCases.find((c) => c.receiptNumber === '26-03-강남경찰서')!
    requestPeriodChange(record.id, '연장', '2026-01-26')

    try {
      renderPage(record.id)
      expect(await screen.findByText('현재 연장 요청이 있습니다')).toBeInTheDocument()
      // 상태 자체는 경호중으로 정규화돼 있어야 한다 — StatusBadge가 "연장"이라는
      // 값을 못 받아서 깨지면 안 됨(toHeader의 resolveDeployStatus 정규화 확인).
      expect(screen.getByText('경호중')).toBeInTheDocument()
    } finally {
      record.pendingPeriodRequest = undefined
    }
  })
})
