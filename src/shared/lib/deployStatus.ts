import type { SecurityCaseStatus } from '@/features/police/types/securityCase'

// Deploy/Police/W/GetDeployList·GetDeployDetail·GetDeployDetailUpdate,
// GuardCase/Stec/W/GetGuardCaseDetail·GetGuardCaseList의 statusName은 표시용
// 문자열이다. 연장/단축 신청이 걸린 경호중 건은 실제 경호상태(경호중) 대신
// "연장"/"단축"으로 온다 — statusName 하나에 경호상태와 신청 대기 여부가 섞여 있다.
//
// 화면은 경호상태(접수/배정/경호중/경호완료/종결/취소)로만 필터·표시하므로, "연장"/"단축"을
// 경호중으로 정규화하지 않으면 신청 대기 건이 목록에서 통째로 사라진다.
//
// 2026-09-15부터 위 5개 API 전부 숫자 guardCaseStatus(0:배정 1:경호중 2:경호완료 3:종결
// 4:경호취소, GetHistoryList와 동일 체계)를 함께 준다 — 있으면 그걸 기본 상태 소스로
// 쓰고, statusName은 "연장"/"단축" 신청 대기 신호 감지 용도로만 남긴다(숫자 코드엔
// 대기 상태가 없어 문자열 감지가 여전히 필요, findings #19 종결).
const GUARD_CASE_STATUS_LABEL: Record<number, SecurityCaseStatus> = {
  0: '배정',
  1: '경호중',
  2: '경호완료',
  3: '종결',
  4: '취소',
}

// 테스트 더블(mocks/handlers/*.ts)이 실 API와 같은 코드 체계로 guardCaseStatus를
// 흉내낼 때 쓰는 역방향 맵 — 위 GUARD_CASE_STATUS_LABEL과 항상 짝이 맞아야 한다.
// '접수'는 GuardCase가 아직 생성되지 않은 상태라 실 API도 null을 준다(코드 없음) —
// 호출부가 `GUARD_CASE_STATUS_CODE[status] ?? null`로 자연히 null 폴백하게 둔다.
export const GUARD_CASE_STATUS_CODE: Partial<Record<SecurityCaseStatus, number>> = {
  배정: 0,
  경호중: 1,
  경호완료: 2,
  종결: 3,
  취소: 4,
}

export function resolveDeployStatus(
  statusName: string,
  code?: number | null,
): {
  status: SecurityCaseStatus
  pendingRequestType?: '연장' | '단축'
} {
  if (statusName === '연장' || statusName === '단축') {
    return { status: '경호중', pendingRequestType: statusName }
  }
  if (code != null && code in GUARD_CASE_STATUS_LABEL) {
    return { status: GUARD_CASE_STATUS_LABEL[code] }
  }
  return { status: statusName as SecurityCaseStatus }
}
