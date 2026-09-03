import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SecurityCaseEditPage from './SecurityCaseEditPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { securityCases } from '../../../mocks/data/securityCases'
import { useAuthStore } from '../../auth/store/authStore'

function renderAt(id: string, client?: QueryClient) {
  const queryClient =
    client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/security-cases/:id/edit', element: <SecurityCaseEditPage /> },
      { path: '/security-cases/:id', element: <p>상세 도착</p> },
    ],
    { initialEntries: [`/security-cases/${id}/edit`] },
  )
  return render(
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
    // GetDeployDetailUpdate로 소스를 바꾸면서 이전엔 prefill 못 하던 필드들도 채워진다
    // (성별/생년월일/직업/거주지/배치장소 — 예전 GetDeployDetail엔 없던 값).
    expect(byLabel('직업')).toHaveValue(record.subject.occupation)
    expect(byLabel('거주지')).toHaveValue(record.subject.residence)
    expect(byLabel('주거지')).toHaveValue(record.location.residence)
    expect(byLabel('직장지')).toHaveValue(record.location.workplace)
    expect(byLabel('시작일')).not.toBeDisabled()
    expect(byLabel('종료일')).not.toBeDisabled()

    fireEvent.change(byLabel('사건개요'), { target: { value: '수정된 사건개요 내용입니다.' } })
    fireEvent.change(byLabel('주거지'), { target: { value: '서울 강남구 새주소 1' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(screen.getByText('상세 도착')).toBeInTheDocument())
    expect(record.caseSummary).toBe('수정된 사건개요 내용입니다.')
    // 배치장소 4필드가 저장 경로를 왕복한다(예전 D-2에선 주거지만 전송됐음).
    expect(record.location.residence).toBe('서울 강남구 새주소 1')
    expect(record.location.workplace).toBe('강남경찰서 관할')
  })

  it('저장 후 다시 수정 화면에 들어오면 방금 저장한 내용이 보인다 (stale 캐시 방지)', async () => {
    loginAsStation()
    const record = findCase('26-02-부산진경찰서')
    // 두 번의 진입이 같은 QueryClient를 공유해야 캐시 재사용 상황을 재현한다.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const first = renderAt(record.id, client)
    await screen.findByText('배치요구서 수정')
    fireEvent.change(byLabel('사건개요'), { target: { value: '두 번째 진입에서 보여야 할 내용' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(screen.getByText('상세 도착')).toBeInTheDocument())
    first.unmount()

    renderAt(record.id, client)
    await screen.findByText('배치요구서 수정')
    await waitFor(() =>
      expect(byLabel('사건개요')).toHaveValue('두 번째 진입에서 보여야 할 내용'),
    )
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
