import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import { useAuthStore, type Role } from '../features/auth/store/authStore'
import { useToastStore } from '../shared/hooks/useToastStore'

function renderProtected(initialPath: string, allow: Role[]) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <div>POLICE LOGIN</div> },
      { path: '/admin', element: <div>COMPANY LOGIN</div> },
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

  it('redirects unauthenticated users to the police login', () => {
    renderProtected('/dashboard', ['본청', '지역청'])
    expect(screen.getByText('POLICE LOGIN')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to the company login under /admin', () => {
    renderProtected('/admin/dashboard', ['시스템관리자'])
    expect(screen.getByText('COMPANY LOGIN')).toBeInTheDocument()
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
