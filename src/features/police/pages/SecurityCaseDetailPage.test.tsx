import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SecurityCaseDetailPage from './SecurityCaseDetailPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { securityCases } from '../../../mocks/data/securityCases'
import { useAuthStore } from '../../auth/store/authStore'

function renderAt(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/security-cases/:id', element: <SecurityCaseDetailPage /> },
      { path: '/security-cases', element: <p>경호목록 도착</p> },
    ],
    { initialEntries: [`/security-cases/${id}`] },
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
}

function findCase(receiptNumber: string) {
  return securityCases.find((c) => c.receiptNumber === receiptNumber)!
}

// 액션 버튼은 데스크톱 헤더/모바일 하단 두 곳에 동시에 렌더링되고 반응형
// CSS로만 토글되므로(jsdom은 미디어쿼리를 평가하지 않음) 항상 두 개씩 잡힌다
// — 첫 번째(데스크톱 헤더)만 골라 쓴다.
function firstButton(name: string) {
  return screen.getAllByRole('button', { name })[0]
}

describe('PoliceSecurityCaseDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('접수 상태에서 접수취소를 누르면 접수가 삭제되고 목록으로 이동한다', async () => {
    loginAsStation()
    const record = findCase('26-02-강남경찰서')
    renderAt(record.id)

    await screen.findByText('기본정보')
    fireEvent.click(firstButton('접수취소'))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '접수취소' }))

    expect(await screen.findByText('경호목록 도착')).toBeInTheDocument()
    expect(securityCases.find((c) => c.id === record.id)).toBeUndefined()
  })

  it('배정 상태에서 사유를 입력하고 경호취소하면 상태가 취소로 바뀌고 목록으로 이동한다', async () => {
    loginAsStation()
    const record = findCase('26-01-강남경찰서')
    renderAt(record.id)

    await screen.findByText('기본정보')
    fireEvent.click(firstButton('경호취소'))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('취소 사유'), {
      target: { value: '대상자 요청으로 취소' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '경호취소' }))

    expect(await screen.findByText('경호목록 도착')).toBeInTheDocument()
    expect(record.status).toBe('취소')
    expect(record.cancelReason).toBe('대상자 요청으로 취소')
  })

  it('경호중 상태에서 연장 요청을 제출하면 승인 대기 배지로 바뀐다', async () => {
    loginAsStation()
    const record = findCase('26-03-강남경찰서')
    renderAt(record.id)

    await screen.findByText('기본정보')
    fireEvent.click(firstButton('연장/단축'))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '연장 요청' }))

    expect(await screen.findAllByText('연장 요청 중 · 승인 대기')).not.toHaveLength(0)
    expect(record.pendingPeriodRequest?.type).toBe('연장')
  })

  it('경호완료 상태에서 파기확인서가 있으면 종결 버튼이 활성화되고 클릭하면 종결된다', async () => {
    loginAsStation()
    const record = findCase('26-04-강남경찰서')
    renderAt(record.id)

    await screen.findByText('기본정보')
    const closeButton = firstButton('종결')
    expect(closeButton).not.toBeDisabled()
    fireEvent.click(closeButton)

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('combobox', { name: '종결 사유' }))
    fireEvent.click(await screen.findByRole('option', { name: '경호기간 만료' }))
    fireEvent.click(within(dialog).getByRole('button', { name: '종결' }))

    await waitFor(() => expect(record.status).toBe('종결'))
    expect(record.closureReason).toBe('경호기간 만료')
  })

  it('종결 사유를 선택하지 않으면 종결이 진행되지 않는다', async () => {
    loginAsStation()
    const base = findCase('26-04-강남경찰서')
    const record = {
      ...base,
      id: 'case-test-closure-validation',
      receiptNumber: '26-06-강남경찰서',
      securityCode: 'ST998',
      status: '경호완료' as const,
    }
    securityCases.push(record)
    renderAt(record.id)

    await screen.findByText('기본정보')
    fireEvent.click(firstButton('종결'))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '종결' }))

    expect(await within(dialog).findByText('종결 사유를 선택해주세요')).toBeInTheDocument()
    expect(record.status).toBe('경호완료')
  })

  it('경호완료 상태여도 파기확인서가 없으면 종결 버튼이 비활성 상태다', async () => {
    loginAsStation()
    const base = findCase('26-04-강남경찰서')
    const record = {
      ...base,
      id: 'case-test-no-cert',
      receiptNumber: '26-05-강남경찰서',
      securityCode: 'ST999',
      status: '경호완료' as const,
      attachments: { ...base.attachments!, destructionCertFileName: null },
    }
    securityCases.push(record)

    renderAt(record.id)

    await screen.findByText('기본정보')
    expect(firstButton('종결')).toBeDisabled()
  })
})
