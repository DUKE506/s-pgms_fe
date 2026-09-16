import { useEffect } from 'react'
import { create } from 'zustand'

// 모바일 하단 floating nav(Sidebar.tsx) 노출 여부 — 폼처럼 입력에 집중해야
// 하는 화면에서 페이지 쪽이 직접 숨김을 요청한다. 라우트 매칭 대신 store로
// 뺀 이유: 본사 경호계획서 정보 등록/수정처럼 URL은 그대로인데 화면 내
// state(editingBaseInfo)로만 폼이 토글되는 케이스가 있어, "이 경로면 숨김"
// 같은 라우트 기반 판단으로는 못 잡는다(2026-09-16 결정).
interface MobileNavState {
  hidden: boolean
  setHidden: (hidden: boolean) => void
}

export const useMobileNavStore = create<MobileNavState>((set) => ({
  hidden: false,
  setHidden: (hidden) => set({ hidden }),
}))

// 페이지에서 이 훅 하나만 호출하면 됨 — hidden이 바뀔 때마다 store에 반영하고,
// 언마운트 시 항상 false로 원복(페이지 전환 시 다음 화면에 nav가 계속 숨겨진
// 채로 남는 걸 방지). 상시 숨김 화면은 useHideMobileNav(true), 조건부 화면은
// useHideMobileNav(editingBaseInfo)처럼 로컬 state를 그대로 넘기면 된다.
export function useHideMobileNav(hidden: boolean) {
  const setHidden = useMobileNavStore((state) => state.setHidden)

  useEffect(() => {
    setHidden(hidden)
    return () => setHidden(false)
  }, [hidden, setHidden])
}
