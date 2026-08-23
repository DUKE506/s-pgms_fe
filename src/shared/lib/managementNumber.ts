// 관리번호 체계 (docs/project-overview.md): 접수번호(YY-MM-경찰서)는 접수 시점에 바로
// 발급되지만, 경호코드(STXXX)는 담당자 배정 시점에야 발급된다. 그래서 접수 단계에서는
// 접수번호만 표기하고, 배정 이후에만 "접수번호 · 경호코드" 형태로 이어붙인다.
export function formatManagementNumber(receiptNumber: string, securityCode?: string): string {
  return securityCode ? `${receiptNumber} · ${securityCode}` : receiptNumber
}
