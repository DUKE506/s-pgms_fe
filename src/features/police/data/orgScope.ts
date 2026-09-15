// 조직 계층 조회범위 트리 — 집계 API 미착수라 전부 정적 더미 데이터.
// docs/mobile-ui/홈 대시보드 (웹).dc.html 좌측 사이드바 목업 실측값 그대로.
export interface OrgScopeOption {
  id: string
  label: string
  count: number
}

export interface OrgRegion extends OrgScopeOption {
  children?: OrgScopeOption[]
}

export const ORG_ROOT: OrgScopeOption = { id: 'all', label: '전체 (본청)', count: 158 }

// 루트를 선택했을 때 히어로/pill에 표시할 축약 라벨 — 트리 행 라벨("전체 (본청)")과는
// 다르게 목업에서 "전국"으로 표기함.
export const ORG_ROOT_SCOPE_LABEL = '전국'

export const ORG_REGIONS: OrgRegion[] = [
  {
    id: 'seoul',
    label: '서울지방경찰청',
    count: 41,
    children: [
      { id: 'gangnam', label: '강남경찰서', count: 9 },
      { id: 'seocho', label: '서초경찰서', count: 7 },
      { id: 'songpa', label: '송파경찰서', count: 6 },
      { id: 'gangdong', label: '강동경찰서', count: 5 },
    ],
  },
  { id: 'gyeonggi-nam', label: '경기남부지방청', count: 37 },
  { id: 'busan', label: '부산지방청', count: 22 },
  { id: 'incheon', label: '인천지방청', count: 19 },
  { id: 'daegu', label: '대구지방청', count: 15 },
  { id: 'gyeonggi-buk', label: '경기북부지방청', count: 3 },
  { id: 'gangwon', label: '강원지방청', count: 3 },
  { id: 'chungbuk', label: '충북지방청', count: 2 },
  { id: 'chungnam', label: '충남지방청', count: 2 },
]

export function scopeLabelFor(option: OrgScopeOption): string {
  return option.id === ORG_ROOT.id ? ORG_ROOT_SCOPE_LABEL : option.label
}
