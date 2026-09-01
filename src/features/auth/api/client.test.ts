import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { policeAccounts } from '../../../mocks/data/accounts'
import { apiFetch } from './client'
import { login } from './auth'
import { useAuthStore } from '../store/authStore'

describe('apiFetch', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null })
  })

  it('refreshes the access token and retries once after a 401', async () => {
    const account = policeAccounts[0]
    const result = await login(account.id, account.password)
    if ('mustChangePassword' in result) throw new Error('unexpected mustChangePassword response')
    const session = result
    useAuthStore.getState().setSession(session)

    let calls = 0
    server.use(
      http.get('/api/protected/ping', ({ request }) => {
        calls += 1
        if (calls === 1) {
          return new HttpResponse(null, { status: 401 })
        }
        return HttpResponse.json({ auth: request.headers.get('authorization') })
      }),
    )

    const res = await apiFetch('/protected/ping')

    expect(calls).toBe(2)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { auth: string }
    expect(body.auth).toBe(`Bearer ${useAuthStore.getState().accessToken}`)
    expect(useAuthStore.getState().accessToken).not.toBe(session.accessToken)
  })

  it('logs out when the refresh token is no longer valid', async () => {
    useAuthStore.getState().setSession({
      user: { id: 'ghost', name: 'Ghost', role: '경찰서' },
      accessToken: 'access.ghost.stale',
      refreshToken: 'refresh.unknown-account.stale',
    })

    server.use(http.get('/api/protected/ping', () => new HttpResponse(null, { status: 401 })))

    const res = await apiFetch('/protected/ping')

    expect(res.status).toBe(401)
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
