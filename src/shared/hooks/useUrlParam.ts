import { useSearchParams } from 'react-router'

// 목록/이력 화면 필터 값 하나를 URL 쿼리스트링과 동기화한다(docs/architecture.md
// "상태관리" — 필터 상태를 URL로 옮겨 새로고침해도 유지). 값이 기본값과 같아지면
// 쿼리에서 지워 URL을 깔끔하게 유지한다.
export function useUrlParam(key: string, defaultValue: string) {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(key) ?? defaultValue

  function setValue(next: string) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === defaultValue) params.delete(key)
        else params.set(key, next)
        return params
      },
      { replace: true },
    )
  }

  return [value, setValue] as const
}
