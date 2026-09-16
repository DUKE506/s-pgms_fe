import { apiFetch } from '../../auth/api/client'
import { assertOk, unwrapEnvelope } from '@/shared/api/envelope'

// [경찰] 홈 대시보드(#18) — 기간(fromDate/toDate) 파라미터는 전부 제외하고 연결한다
// (2026-09-16 사용자 결정, 서버 기본값=이번 달을 그대로 씀). groupSeq만 조직 트리
// 선택에 따라 넘긴다. crimeType도 스웨거 params에서 빠져 있어 안 보낸다.
//
// 조직 트리 구조는 별도 API(Login/W/GetGroupTree) 없이 GetDashBoardGroupCount 하나로
// 해결한다(2026-09-16 결정 A안) — totalCount:0인 노드도 트리에서 빠지지 않고 그대로
// 내려오는 걸 프로브로 확인함(docs/backend-integration/responses/DashBoard-Police-
// GetDashBoardGroupCount.md).

// 상태별 건수(GetDashBoardCount) 응답. 실측: DashBoard-Police-GetDashBoardCount.md
export interface DashboardCounts {
  receipt: number
  assignment: number
  inprogress: number
  complete: number
  total: number
}

// 조직별 건수 트리(GetDashBoardGroupCount) 응답 노드. 실측:
// DashBoard-Police-GetDashBoardGroupCount.md — Login/GetGroupTree와 필드명이 다르다
// (parentSeq/depth, GetGroupTree는 parentGroupSeq/level).
export interface OrgCountNode {
  groupSeq: number
  parentSeq: number | null
  groupName: string
  depth: number
  totalCount: number
  children: OrgCountNode[]
}

interface GenderCountResponse {
  maleCount: number
  // 실 API 필드명이 femaleCount가 아니라 feMaleCount다(오타성 캐멀케이스, 실측 확인).
  feMaleCount: number
}

interface AvgGuardDaysResponse {
  avgGuardDays: number
}

interface AvgAgeResponse {
  avgGuardAge: number
}

interface SummaryCountResponse {
  customized: number
  accommodation: number
  watch: number
  cctv: number
}

interface AgeGroupRow {
  ageGroup: number
  count: number
}

export interface TopOrderRow {
  groupSeq: number
  groupName: string
  count: number
}

interface MonthCountRow {
  date: string
  // 실측 결과 "그 달 건수 하나"가 객체가 아니라 객체 1개짜리 배열로 온다
  // (counts:[{...}]) — 언랩 필요.
  counts: DashboardCounts[]
}

async function getDashboard<T>(verb: string, groupSeq: number | undefined, errorMessage: string): Promise<T> {
  const query = groupSeq != null ? `?groupSeq=${groupSeq}` : ''
  const res = await apiFetch(`/v1/DashBoard/Police/W/${verb}${query}`)
  assertOk(res, errorMessage)
  return unwrapEnvelope<T>(res)
}

// 조직 트리 구조 — groupSeq 없이(=로그인 계정 기본 스코프) 한 번만 불러온다. 조직
// 선택마다 이 트리 자체를 다시 불러오면 매번 "선택한 노드가 새 뿌리"로 좁혀져
// 상위 계층이 화면에서 사라지고(본청 → 지방청 선택 → 그 지방청 산하만 보임),
// "전국" 판정도 매번 그 좁아진 뿌리를 기준으로 잘못 계산된다(2026-09-16 브라우저
// 검증 중 발견 — 지방청→경찰서로 드릴다운하면 라벨이 "전국"으로 잘못 표시됨).
// 트리는 고정해두고, 조직 선택은 아래 getDashboardBundle의 groupSeq로만 반영한다.
export async function getOrgTree(): Promise<OrgCountNode> {
  const rows = await getDashboard<OrgCountNode[]>(
    'GetDashBoardGroupCount',
    undefined,
    '조직 트리를 불러오지 못했습니다',
  )
  // 응답이 뿌리 노드 1개짜리 배열로 온다(실측 확인).
  return rows[0]
}

// 화면 전체가 쓰는 값을 한 번에 조립한다(#18 계획 — 개별 카드 로딩 분기 대신 화면
// 하나가 한 iteration이므로 단일 쿼리로 묶음, #9 "조회 5종 조립"과 같은 패턴).
// topOrder는 본청/지역청 전용(경찰서는 순위 개념이 안 맞아 UI에서 섹션 자체를 뺀다,
// 2026-09-16 결정) — includeTopOrder=false면 호출하지 않는다.
export interface DashboardBundle {
  counts: DashboardCounts
  avgGuardDays: number
  maleCount: number
  femaleCount: number
  monthly: { date: string; total: number }[]
  avgAge: number
  summary: SummaryCountResponse
  ageGroups: AgeGroupRow[]
  topOrder: TopOrderRow[] | null
}

export async function getDashboardBundle(
  groupSeq: number | undefined,
  includeTopOrder: boolean,
): Promise<DashboardBundle> {
  const [counts, avgGuardDaysRes, genderRes, monthRows, avgAgeRes, summary, ageGroups, topOrder] = await Promise.all([
    getDashboard<DashboardCounts>('GetDashBoardCount', groupSeq, '상태별 건수를 불러오지 못했습니다'),
    getDashboard<AvgGuardDaysResponse>('GetDashBoardAvgGuardDays', groupSeq, '평균 경호기간을 불러오지 못했습니다'),
    getDashboard<GenderCountResponse>('GetDashBoardGenderCount', groupSeq, '성별 건수를 불러오지 못했습니다'),
    getDashboard<MonthCountRow[]>('GetMonthDashBoardCount', groupSeq, '월별 추이를 불러오지 못했습니다'),
    getDashboard<AvgAgeResponse>('GetDashBoardAvgAge', groupSeq, '평균 나이를 불러오지 못했습니다'),
    getDashboard<SummaryCountResponse>(
      'GetDashBoardSummaryCount',
      groupSeq,
      '안전조치 항목별 건수를 불러오지 못했습니다',
    ),
    getDashboard<AgeGroupRow[]>('GetDashBoardAgeGroup', groupSeq, '연령대별 건수를 불러오지 못했습니다'),
    includeTopOrder
      ? getDashboard<TopOrderRow[]>('GetDashBoardTopOrder', groupSeq, '지역별 건수 순위를 불러오지 못했습니다')
      : Promise.resolve(null),
  ])

  return {
    counts,
    avgGuardDays: avgGuardDaysRes.avgGuardDays,
    maleCount: genderRes.maleCount,
    femaleCount: genderRes.feMaleCount,
    // 최신→과거 순으로 오므로 차트용으로 뒤집는다(과거→최신).
    monthly: [...monthRows].reverse().map((row) => ({ date: row.date, total: row.counts[0]?.total ?? 0 })),
    avgAge: avgAgeRes.avgGuardAge,
    summary,
    ageGroups,
    topOrder,
  }
}
