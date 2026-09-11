// API 호출 실패 시 상태 코드를 들고 다니는 공용 에러. 지금까지 대부분의 API 함수가
// `if (!res.ok) throw new Error(메시지)`로 상태 코드를 버려서, 호출부가 403/404(스코프
// 차단·존재하지 않음)와 500/네트워크 오류를 구분할 수 없었다. 상세 조회 화면(경호상세·
// 이력상세)이 이 구분으로 AccessBlockedScreen을 띄운다(shared/components/AccessBlockedScreen).
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isNotFoundOrForbidden(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404)
}
