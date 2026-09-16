// 조직 계층 조회범위 트리 — 구조·건수 둘 다 실 API(GetDashBoardGroupCount)에서 오므로
// 여기는 화면·OrgScopeTree가 공유하는 타입만 남긴다(#18, 2026-09-16 A안 — 이전엔
// 정적 더미 데이터 파일이었음).
export interface OrgScopeOption {
  id: string
  label: string
  count: number
}

export interface OrgRegion extends OrgScopeOption {
  children?: OrgScopeOption[]
}
