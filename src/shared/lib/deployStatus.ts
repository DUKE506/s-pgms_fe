import type { SecurityCaseStatus } from '@/features/police/types/securityCase'

// Deploy/Police/W/GetDeployList·GetDeployDetail의 statusName은 표시용 문자열이다.
// 연장/단축 신청이 걸린 경호중 건은 실제 경호상태(경호중) 대신 "연장"/"단축"으로 온다
// — statusName 하나에 경호상태와 신청 대기 여부가 섞여 있다.
//
// 화면은 경호상태(접수/배정/경호중/경호완료/종결/취소)로만 필터·표시하므로, "연장"/"단축"을
// 경호중으로 정규화하지 않으면 신청 대기 건이 목록에서 통째로 사라진다.
//
// 백엔드에 숫자 status(0:배정 1:경호중 2:경호완료 3:종결 4:경호취소, GetHistoryList가 이미
// 제공)를 GetDeployList/GetDeployDetail에도 추가 요청함(findings #19). 오면 그 값을 소스로
// 쓰고 이 문자열 정규화는 신청 대기 표시용으로만 남긴다.
export function resolveDeployStatus(statusName: string): {
  status: SecurityCaseStatus
  pendingRequestType?: '연장' | '단축'
} {
  if (statusName === '연장' || statusName === '단축') {
    return { status: '경호중', pendingRequestType: statusName }
  }
  return { status: statusName as SecurityCaseStatus }
}
