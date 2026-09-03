import { useAuthStore } from '../store/authStore'
import { unwrapEnvelope } from '@/shared/api/envelope'

interface RefreshedTokens {
  accessToken: string
  refreshToken: string
}

// 진행 중인 refresh 요청. 여러 API 호출이 동시에 401을 받아도 RefreshToken은
// 한 번만 나가게 한다(single-flight).
let inFlightRefresh: Promise<string | null> | null = null

async function doRefreshAccessToken(): Promise<string | null> {
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

// 실제 백엔드의 RefreshToken은 1회용이다 — 호출 때마다 refreshToken을 회전시키고,
// 회전 전 토큰으로 다시 부르면 401을 준다(Login-RefreshToken.md 실측). 한 화면이
// 여러 요청을 동시에 던지면(특히 아직 mock이라 전부 한꺼번에 401 나는 화면) 각
// 요청이 제각기 refresh를 시도해, 두 번째부터는 이미 무효가 된 토큰으로 호출 →
// 401 → logout으로 튕긴다. 그래서 동시에 들어온 refresh는 하나의 promise를 공유한다.
async function refreshAccessToken(): Promise<string | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = doRefreshAccessToken().finally(() => {
      inFlightRefresh = null
    })
  }
  return inFlightRefresh
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
