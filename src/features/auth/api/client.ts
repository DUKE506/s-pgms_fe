import { useAuthStore } from '../store/authStore'

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) return null

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    useAuthStore.getState().logout()
    return null
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string }
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
