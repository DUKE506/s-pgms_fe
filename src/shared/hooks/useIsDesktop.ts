import { useEffect, useState } from 'react'

// Tailwind `xl` 브레이크포인트(1280px)와 동일 — 하이브리드 페이지네이션(xl 이상
// 번호형·xl 미만 더보기)이 어떤 fetch 전략을 쓸지 가르는 유일한 JS 분기다. 렌더링
// 자체는 항상 CSS(`xl:` 클래스)로 나눈다.
const DESKTOP_QUERY = '(min-width: 1280px)'

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setIsDesktop(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}
