// 관리번호 체계 (docs/project-overview.md): 접수번호(YY-MM-경찰서)는 접수 시점에 바로
// 발급되지만, 경호코드(STXXX)는 담당자 배정 시점에야 발급된다. 그래서 접수 단계에서는
// 접수번호만 표기하고, 배정 이후에만 "접수번호 · 경호코드" 형태로 이어붙인다.
export function formatManagementNumber(receiptNumber: string, securityCode?: string): string {
  return securityCode ? `${receiptNumber} · ${securityCode}` : receiptNumber
}

// 실제 백엔드(Deploy/Police 계열)는 관리번호를 이미 조합된 완성 문자열로 내려준다 —
// 접수 단계는 경호코드 자리에 "접수"를 넣어 "26-08-동래경찰서 접수", 배정 이후엔
// 경호코드가 들어가 "26-08-동래경찰서 ST123". 마지막 공백에서 잘라 접수번호와
// 경호코드 자리로 나눈 뒤, 화면은 formatManagementNumber로 "접수번호 · 경호코드"
// 형태로 재조합한다(접수 단계는 "… · 접수"로 표시됨). 목록/상세 연동이 공유한다.
export function splitMgmtNo(mgmtNo: string): { receiptNumber: string; securityCode?: string } {
  const i = mgmtNo.lastIndexOf(' ')
  if (i === -1) return { receiptNumber: mgmtNo }
  return { receiptNumber: mgmtNo.slice(0, i), securityCode: mgmtNo.slice(i + 1) }
}
