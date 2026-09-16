import { securityCaseHandlers } from './securityCases'
import { workerHandlers } from './workers'
import { guestTestHandlers } from './guests'
import { authHandlers } from './auth'
import { deployTestHandlers } from './deploy'
import { guardTestHandlers } from './guard'
import { guardCaseTestHandlers } from './guardCase'
import { guardCaseDetailTestHandlers } from './guardCaseDetail'
import { historyTestHandlers } from './history'
import { dashboardTestHandlers } from './dashboard'

// 아직 mock인 화면들 — 브라우저(dev)와 테스트(vitest) 둘 다 이 배열을 쓴다.
export const handlers = [...securityCaseHandlers, ...workerHandlers]

// 실제 백엔드로 연동 완료된 화면(로그인, 경찰서 경호목록, 이력, 게스트 계정 관리,
// 홈 대시보드) — 테스트(vitest)에서만 등록한다. 브라우저에 등록하면 실제 백엔드로
// 나가야 할 요청을 MSW가 가로채 버려서 안 된다(mocks/handlers/auth.ts 상단 설명 참고).
export const testOnlyHandlers = [
  ...authHandlers,
  ...deployTestHandlers,
  ...guardTestHandlers,
  ...guardCaseTestHandlers,
  ...guardCaseDetailTestHandlers,
  ...historyTestHandlers,
  ...guestTestHandlers,
  ...dashboardTestHandlers,
]
