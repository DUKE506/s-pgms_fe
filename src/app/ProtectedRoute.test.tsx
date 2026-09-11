import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import { useAuthStore, type Role } from '../features/auth/store/authStore'
import { useToastStore } from '../shared/hooks/useToastStore'

function renderProtected(initialPath: string, allow: Role[]) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <div>LOGIN</div> },
      { path: '/security-cases', element: <div>SECURITY CASES DEFAULT</div> },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute allow={allow}>
            <div>DASHBOARD CONTENT</div>
          </ProtectedRoute>
        ),
      },
      {
        path: '/admin/dashboard',
        element: (
          <ProtectedRoute allow={allow}>
            <div>ADMIN DASHBOARD CONTENT</div>
          </ProtectedRoute>
        ),
      },
    ],
    { initialEntries: [initialPath] },
  )
  return render(<RouterProvider router={router} />)
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
    useToastStore.setState({ toasts: [] })
  })

  it('redirects unauthenticated users to the login screen', () => {
    renderProtected('/dashboard', ['본청', '지역청'])
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })

  it('redirects unauthenticated users from an /admin route to the same single login screen', () => {
    // 로그인 화면 통합(2026-09-11) — 더 이상 /admin 전용 로그인이 없어 경로와 무관하게
    // 항상 같은 로그인 화면으로 간다.
    renderProtected('/admin/dashboard', ['시스템관리자'])
    expect(screen.getByText('LOGIN')).toBeInTheDocument()
  })

  it("redirects a user without the required role to their default route, with a toast", async () => {
    useAuthStore.getState().setSession({
      user: { id: 'gangnam', name: '강남경찰서', role: '경찰서' },
      accessToken: 'a',
      refreshToken: 'r',
    })

    renderProtected('/dashboard', ['본청', '지역청'])

    expect(screen.getByText('SECURITY CASES DEFAULT')).toBeInTheDocument()
    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1))
  })

  it('renders the protected content for an allowed role', () => {
    useAuthStore.getState().setSession({
      user: { id: 'hq', name: '본청 관리자', role: '본청' },
      accessToken: 'a',
      refreshToken: 'r',
    })

    renderProtected('/dashboard', ['본청', '지역청'])

    expect(screen.getByText('DASHBOARD CONTENT')).toBeInTheDocument()
  })
})
