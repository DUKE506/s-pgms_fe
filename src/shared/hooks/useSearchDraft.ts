import { useState } from 'react'

// 검색창의 "입력 중" 값을 커밋된 값(URL 등)과 분리한다 — 매 키 입력마다 커밋된
// 값을 갱신하면(예: URL 쿼리 동기화) 그 리렌더가 한글 조합(IME) 중간에 끼어들어
// 글자가 깨진다(2026-09-18 사용자 리포트: "이동희" 입력 시 "ㅇㅣㄷㅗㅇ"으로 분해).
// draft는 평범한 로컬 state라 조합 문제가 없고, 커밋된 값이 바깥에서 바뀌면
// (뒤로가기·필터 초기화 등) draft도 따라간다.
//
// 렌더 중 상태 조정(React 공식 패턴, shared/components/DateField.tsx의
// DateTextField와 동일) — useEffect로 하면 커밋 후 한 번 더 렌더가 도는
// cascading render라 렌더 중 setState로 처리한다.
export function useSearchDraft(committed: string) {
  const [draft, setDraft] = useState(committed)
  const [prevCommitted, setPrevCommitted] = useState(committed)

  if (committed !== prevCommitted) {
    setPrevCommitted(committed)
    setDraft(committed)
  }

  return [draft, setDraft] as const
}
