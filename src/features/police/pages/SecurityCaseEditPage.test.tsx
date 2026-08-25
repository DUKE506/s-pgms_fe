import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SecurityCaseEditPage from './SecurityCaseEditPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { securityCases } from '../../../mocks/data/securityCases'
import { useAuthStore } from '../../auth/store/authStore'

function renderAt(id: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/security-cases/:id/edit', element: <SecurityCaseEditPage /> },
      { path: '/security-cases/:id', element: <p>상세 도착</p> },
    ],
    { initialEntries: [`/security-cases/${id}/edit`] },
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

function byLabel(text: string) {
  return screen.getByLabelText(text, { exact: false })
}

function findCase(receiptNumber: string) {
  return securityCases.find((c) => c.receiptNumber === receiptNumber)!
}

describe('SecurityCaseEditPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('접수 상태에서는 기존 값이 채워져 있고 배치기간도 수정 가능하다', async () => {
    loginAsStation()
    const record = findCase('26-02-강남경찰서')
    renderAt(record.id)

    await screen.findByText('배치요구서 수정')
    expect(byLabel('성명 (성만 표기)')).toHaveValue(record.subject.nameInitial)
    expect(byLabel('시작일')).not.toBeDisabled()
    expect(byLabel('종료일')).not.toBeDisabled()

    fireEvent.change(byLabel('사건개요'), { target: { value: '수정된 사건개요 내용입니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(screen.getByText('상세 도착')).toBeInTheDocument())
    expect(record.caseSummary).toBe('수정된 사건개요 내용입니다.')
  })

  it('경호중 상태에서는 배치기간 입력이 비활성화된다', async () => {
    loginAsStation()
    const record = findCase('26-03-강남경찰서')
    renderAt(record.id)

    await screen.findByText('배치요구서 수정')
    expect(byLabel('시작일')).toBeDisabled()
    expect(byLabel('종료일')).toBeDisabled()
    expect(screen.getByText(/경호중 이후에는 배치기간을 수정할 수 없습니다/)).toBeInTheDocument()
  })
})
