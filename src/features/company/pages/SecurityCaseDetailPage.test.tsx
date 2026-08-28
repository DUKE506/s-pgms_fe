import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SecurityCaseDetailPage from './SecurityCaseDetailPage'
import { companyAccounts } from '../../../mocks/data/accounts'
import { assignManager, securityCases } from '../../../mocks/data/securityCases'
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

// 경호취소 버튼은 데스크톱 헤더/모바일 하단 두 곳에 동시에 렌더링되므로(반응형 토글, 둘 다
// jsdom엔 잡힘) 첫 번째(데스크톱 헤더)만 골라 쓴다.
function firstButton(name: string) {
  return screen.getAllByRole('button', { name })[0]
}

function loginAsAdmin() {
  const account = companyAccounts.find((a) => a.id === 'opadmin')!
  useAuthStore.setState({
    user: { id: account.id, name: account.name, role: account.role },
    accessToken: `access.${account.id}.test`,
    refreshToken: `refresh.${account.id}.test`,
  })
}

// 접수 상태 케이스를 하나 배정해서(경호코드 발급) 상세 화면 테스트용 대상으로 삼는다.
function assignedCaseId(): string {
  const record = securityCases.find((c) => c.status === '접수')!
  assignManager(record.id, '김민수')
  return record.id
}

describe('SecurityCaseDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('기본정보 미등록 상태에서도 배정 상태면 경호취소 버튼이 활성이다', async () => {
    loginAsAdmin()
    renderPage(assignedCaseId())

    expect(await screen.findByText('기본정보가 등록되지 않았습니다')).toBeInTheDocument()
    expect(firstButton('경호취소')).toBeEnabled()
  })

  it('경호취소는 사유 입력이 필수이고, 입력하면 상태가 취소로 바뀐다', async () => {
    loginAsAdmin()
    const caseId = assignedCaseId()
    renderPage(caseId)
    await screen.findByText('기본정보가 등록되지 않았습니다')

    fireEvent.click(firstButton('경호취소'))
    const dialog = await screen.findByRole('dialog')

    fireEvent.click(within(dialog).getByRole('button', { name: '경호취소' }))
    expect(await within(dialog).findByText('취소 사유를 입력해주세요')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('취소 사유'), {
      target: { value: '피해자 요청으로 경호취소' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '경호취소' }))

    await waitFor(() => {
      const updated = securityCases.find((c) => c.id === caseId)!
      expect(updated.status).toBe('취소')
      expect(updated.cancelReason).toBe('피해자 요청으로 경호취소')
    })
    expect(screen.queryByRole('button', { name: '경호취소' })).not.toBeInTheDocument()
  })

  it('기본정보 등록 → 스케줄 생성 → 그룹 수정까지 전체 흐름이 동작한다', async () => {
    loginAsAdmin()
    const caseId = assignedCaseId()
    renderPage(caseId)
    await screen.findByText('기본정보가 등록되지 않았습니다')

    // 1) 기본정보 등록: 근무자 2명 추가, 첫 번째만 대표근무자로 지정
    fireEvent.click(screen.getByRole('button', { name: /기본정보 등록/ }))
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
    const editButtons = screen.getAllByRole('button', { name: '수정' })
    fireEvent.click(editButtons[editButtons.length - 1])
    await screen.findByText('그룹 추가/수정')

    const startInputs = screen.getAllByDisplayValue('09:00')
    fireEvent.change(startInputs[0], { target: { value: '10:00' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      const saved = securityCases.find((c) => c.id === caseId)!
      expect(saved.workSchedule!.days[0].groups[0].assignments[0].startTime).toBe('10:00')
    })
  })
})
