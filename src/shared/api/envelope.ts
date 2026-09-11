import { ApiError } from './errors'

// 실제 백엔드는 성공/실패 공통으로 { message, data, code } 형태로 응답을 감싼다
// (docs/backend-integration/responses/Login-*.md 실측 확인, code 필드는 성공 시에도
// 매번 다른 값이라 의미 불명 — 프론트에서는 안 씀). 연동되는 화면마다 반복될
// 패턴이라 공용으로 뺐다.
interface Envelope<T> {
  message: string
  data: T
  code: number
}

export async function unwrapEnvelope<T>(res: Response): Promise<T> {
  const body = (await res.json()) as Envelope<T>
  return body.data
}

// 실패 시 상태 코드를 들고 다니는 ApiError를 던진다(shared/api/errors.ts). 상세 조회 화면이
// 403/404(스코프 차단·존재하지 않음)를 구분해 AccessBlockedScreen을 띄우는 데 쓴다.
export function assertOk(res: Response, fallbackMessage: string): void {
  if (!res.ok) {
    throw new ApiError(res.status, fallbackMessage)
  }
}
