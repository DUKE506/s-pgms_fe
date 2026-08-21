import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import SecurityCaseNewPage from './SecurityCaseNewPage'
import { policeAccounts } from '../../../mocks/data/accounts'
import { securityCases } from '../../../mocks/data/securityCases'
import { useAuthStore } from '../../auth/store/authStore'

function renderAtRoot() {
  const router = createMemoryRouter(
    [
      { path: '/security-cases/new', element: <SecurityCaseNewPage /> },
      { path: '/security-cases', element: <p>경호목록 도착</p> },
    ],
    { initialEntries: ['/security-cases/new'] },
  )
  render(<RouterProvider router={router} />)
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

function byLabel(text: string) {
  return screen.getByLabelText(text, { exact: false })
}

async function fillRequiredFields() {
  fireEvent.change(byLabel('성명 (성만 표기)'), { target: { value: '홍○○' } })
  fireEvent.click(byLabel('성별'))
  fireEvent.click(await screen.findByRole('option', { name: '여' }))
  fireEvent.change(byLabel('출생년도'), { target: { value: '1988' } })
  fireEvent.change(byLabel('나이(만)'), { target: { value: '38' } })
  fireEvent.change(byLabel('직업'), { target: { value: '회사원' } })
  fireEvent.change(byLabel('거주지'), {
    target: { value: '서울 강남구 테헤란로 123' },
  })
  fireEvent.click(screen.getByRole('button', { name: '스토킹' }))
  fireEvent.change(byLabel('사건개요'), {
    target: { value: '지속적인 접근 시도가 확인되어 신변보호 조치가 필요함.' },
  })
  fireEvent.change(byLabel('시작일'), { target: { value: '2026-02-01' } })
  fireEvent.change(byLabel('종료일'), { target: { value: '2026-02-15' } })
  fireEvent.change(byLabel('주거지'), {
    target: { value: '서울 강남구 테헤란로 123' },
  })
  fireEvent.change(byLabel('직장지'), {
    target: { value: '서울 강남구 역삼로 45' },
  })
  fireEvent.change(byLabel('피해자전담경찰관'), { target: { value: '홍길동' } })
  fireEvent.change(byLabel('수사관'), { target: { value: '김수사' } })
  fireEvent.change(byLabel('요구자'), {
    target: { value: '강남경찰서 여청과 여청계 경사 홍길동' },
  })
}

describe('SecurityCaseNewPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    securityCases.length = 0
  })

  it('blocks submission and flags missing fields when required fields are empty', async () => {
    loginAsStation()
    renderAtRoot()

    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() =>
      expect(byLabel('성명 (성만 표기)')).toHaveAttribute('aria-invalid', 'true'),
    )
    expect(securityCases).toHaveLength(0)
  })

  it('submits a complete form, creates the case, and navigates to the list', async () => {
    const account = loginAsStation()
    renderAtRoot()

    await fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(screen.getByText('경호목록 도착')).toBeInTheDocument())
    expect(securityCases).toHaveLength(1)
    expect(securityCases[0]).toMatchObject({
      status: '접수',
      caseType: '스토킹',
      policeStation: account.name,
    })
  })
})
