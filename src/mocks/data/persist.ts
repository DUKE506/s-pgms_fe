// mock 데이터(securityCases/workers 등)를 localStorage에 얹어 새로고침·재접속에도
// 유지되게 한다 — mock이 사실상 "가짜 백엔드" 역할이라 여기서만 처리하면 컴포넌트/
// 훅 쪽은 전혀 안 건드려도 된다 (2026-08-24 결정). 테스트(vitest)는 매 파일 pristine
// seed 데이터를 전제로 짜여 있어 절대 손대지 않는다.
const persistable = typeof window !== 'undefined' && import.meta.env.MODE !== 'test'

export function loadPersisted<T>(key: string, seed: T): T {
  if (!persistable) return seed
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : seed
  } catch {
    return seed
  }
}

export function savePersisted<T>(key: string, value: T): void {
  if (!persistable) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 프라이빗 모드 등으로 localStorage를 못 쓰면 조용히 무시 — 메모리 상에서는 계속 동작
  }
}
