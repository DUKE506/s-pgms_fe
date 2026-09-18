import { useUrlParam } from './useUrlParam'
import { useSearchDraft } from './useSearchDraft'

// 검색창 하나가 URL 쿼리 파라미터 하나에 직접 매핑되는 단순한 화면(필터가 검색뿐인
// 화면들)이 쓰는 조합 훅 — useUrlParam(커밋된 값 ↔ URL) + useSearchDraft(입력 중
// 값)를 묶어, 엔터/검색 버튼을 눌러야 커밋되게 한다(IME 조합 깨짐 방지,
// docs/architecture.md "상태관리"). 필터가 여러 개라 커밋 시 다른 파라미터도 같이
// 다뤄야 하는 화면(예: 본사 경호목록)은 이 훅 대신 useSearchDraft만 직접 쓴다.
export function useUrlSearchInput(key: string) {
  const [value, setValue] = useUrlParam(key, '')
  const [draft, setDraft] = useSearchDraft(value)

  function commit() {
    setValue(draft)
  }

  return { value, draft, setDraft, commit } as const
}
