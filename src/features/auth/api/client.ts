import { useAuthStore } from '../store/authStore'
import { unwrapEnvelope } from '@/shared/api/envelope'

interface RefreshedTokens {
  accessToken: string
  refreshToken: string
}

async function refreshAccessToken(): Promise<string | null> {
  const { accessToken, refreshToken } = useAuthStore.getState()
  if (!accessToken || !refreshToken) return null

  const res = await fetch('/api/v1/Login/W/RefreshToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
  })

  if (!res.ok) {
    useAuthStore.getState().logout()
    return null
  }

  const data = await unwrapEnvelope<RefreshedTokens>(res)
  useAuthStore.setState({ accessToken: data.accessToken, refreshToken: data.refreshToken })
  return data.accessToken
}

function withAuthHeader(init: RequestInit, token: string | null): RequestInit {
  if (!token) return init
  return {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = useAuthStore.getState().accessToken
  let res = await fetch(`/api${path}`, withAuthHeader(init, accessToken))

  if (res.status === 401) {
    const newAccessToken = await refreshAccessToken()
    if (newAccessToken) {
      res = await fetch(`/api${path}`, withAuthHeader(init, newAccessToken))
    }
  }

  return res
}
