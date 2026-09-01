import type { Role } from '../store/authStore'

// 실제 백엔드의 codeSeq(BASIC_CODE) → 프론트 Role. codeName을 그대로 쓸 수
// 없다 — 본청(4)/지방청(5)/피전(6)은 실제 codeName과 우리 Role 라벨 자체가
// 다르다(docs/backend-integration-responses/Login-GetMyProfile.md 실측 확인).
// 7(게스트)은 게스트 계정으로 직접 확인은 못 했지만 analysis.md 6-1의
// BASIC_CODE 매핑(4본청/5지방청/6피전/7게스트)과 나머지 6개가 전부 실측과
// 일치해 신뢰도 높음 — 게스트 발급 연동(matrix 6번) 시점에 재확인.
const ROLE_BY_CODE_SEQ: Record<number, Role> = {
  1: '시스템관리자',
  2: '운영관리자',
  3: '본부관리자',
  4: '본청',
  5: '지역청',
  6: '경찰서',
  7: '게스트',
}

export function roleFromCodeSeq(codeSeq: number): Role {
  const role = ROLE_BY_CODE_SEQ[codeSeq]
  if (!role) throw new Error(`알 수 없는 codeSeq입니다: ${codeSeq}`)
  return role
}
