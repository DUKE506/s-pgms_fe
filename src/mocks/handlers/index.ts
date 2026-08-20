import { http, HttpResponse } from 'msw'

// TODO: 배선 확인용 stub. 다음 커밋(로그인 화면)에서 auth.ts로 교체.
export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ ok: true })
  }),
]
