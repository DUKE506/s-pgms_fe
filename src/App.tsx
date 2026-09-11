import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import ToastViewport from './shared/components/ToastViewport'
import { isNotFoundOrForbidden } from './shared/api/errors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 403/404(스코프 차단·존재하지 않음)는 재시도해도 결과가 안 바뀐다 — 기본 3회
      // 재시도를 그대로 두면 상세 화면에서 ~5초 지연 + 콘솔 노이즈만 남는다
      // (2026-09-08 관찰, 2026-09-11 URL 스코프 테스트 중 재확인). 그 외 에러(네트워크
      // 오류 등)는 기존 기본 동작(3회) 유지.
      retry: (failureCount, error) => !isNotFoundOrForbidden(error) && failureCount < 3,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ToastViewport />
    </QueryClientProvider>
  )
}

export default App
