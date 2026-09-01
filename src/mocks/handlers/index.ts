import { securityCaseHandlers } from './securityCases'
import { managerHandlers } from './managers'
import { workerHandlers } from './workers'
import { guestHandlers } from './guests'
import { companyAccountHandlers } from './companyAccounts'
import { authHandlers } from './auth'
import { deployTestHandlers } from './deploy'

// 아직 mock인 화면들 — 브라우저(dev)와 테스트(vitest) 둘 다 이 배열을 쓴다.
export const handlers = [
  ...securityCaseHandlers,
  ...managerHandlers,
  ...workerHandlers,
  ...guestHandlers,
  ...companyAccountHandlers,
]

// 실제 백엔드로 연동 완료된 화면(로그인, 경찰서 경호목록) — 테스트(vitest)에서만
// 등록한다. 브라우저에 등록하면 실제 백엔드로 나가야 할 요청을 MSW가 가로채
// 버려서 안 된다(mocks/handlers/auth.ts 상단 설명 참고).
export const testOnlyHandlers = [...authHandlers, ...deployTestHandlers]
