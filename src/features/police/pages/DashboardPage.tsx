import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, Inbox, Shield, UserCheck } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useAuthStore } from '../../auth/store/authStore'
import type { SecurityCaseStatus } from '../types/securityCase'
import OrgScopeTree from '../components/OrgScopeTree'
import RatioDonut from '../components/RatioDonut'
import RankedBarChart from '../components/RankedBarChart'
import MonthlyTrendChart from '../components/MonthlyTrendChart'
import GenderSplitBar from '../components/GenderSplitBar'
import GaugeRing from '../components/GaugeRing'
import { getDashboardBundle, getOrgTree, type OrgCountNode } from '../api/dashboard'
import type { OrgRegion, OrgScopeOption } from '../data/orgScope'

// [본청/지역청/경찰서] 홈 대시보드 — 모바일: docs/mobile-ui/홈 대시보드 (모바일).dc.html,
// 데스크톱(xl 이상): docs/mobile-ui/홈 대시보드 (웹).dc.html. 두 목업이 레이아웃
// 자체가 달라(웹은 좌측 조직트리 사이드바 상시 노출 + 월별추이·안전조치 섹션
// 추가) Sidebar.tsx와 같은 방식으로 xl 기준 완전히 다른 두 트리를 CSS로
// 토글한다(하나의 JS 미디어쿼리 대신 hidden/xl:hidden 클래스로 분기).
//
// #18(2026-09-16) 실 API 전환. 기간(fromDate/toDate) 파라미터는 전부 제외(서버 기본값=
// 이번 달), 조직 트리 선택(scope)만 groupSeq로 넘긴다. 조직 트리 구조는 별도 API 없이
// GetDashBoardGroupCount 하나로 해결(A안, src/features/police/api/dashboard.ts 참고).
const VISIBLE_STATUSES = ['접수', '배정', '경호중', '경호완료'] as const satisfies readonly SecurityCaseStatus[]

const STATUS_ICON: Record<(typeof VISIBLE_STATUSES)[number], typeof Inbox> = {
  접수: Inbox,
  배정: UserCheck,
  경호중: Shield,
  경호완료: CheckCircle2,
}

const STATUS_DOT_COLOR: Record<(typeof VISIBLE_STATUSES)[number], string> = {
  접수: 'bg-status-received',
  배정: 'bg-status-assigned',
  경호중: 'bg-status-active',
  경호완료: 'bg-status-completed',
}

// 연령대 6구간(GetDashBoardAgeGroup 고정 스펙 — 10=19세 이하, 60=60세 이상). 상태별
// KPI와 중복이라 상태별 비율 대신 연령층 비율을 쓴다(2026-09-15 사용자 결정).
// 순차(sequential) 블루 램프 — 가장 밝은 단계가 흰 카드 배경에서 안 보여서 기존
// --chart-1~5(무채색) 토큰 대신 씀.
const AGE_GROUP_META: Record<number, { label: string; dot: string; color: string }> = {
  10: { label: '10대 이하', dot: 'bg-[#93c5fd]', color: '#93c5fd' },
  20: { label: '20대', dot: 'bg-[#60a5fa]', color: '#60a5fa' },
  30: { label: '30대', dot: 'bg-[#3b82f6]', color: '#3b82f6' },
  40: { label: '40대', dot: 'bg-[#2563eb]', color: '#2563eb' },
  50: { label: '50대', dot: 'bg-[#1d4ed8]', color: '#1d4ed8' },
  60: { label: '60대 이상', dot: 'bg-[#1e40af]', color: '#1e40af' },
}

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0
}

// 조회월 pill — 여전히 장식용(2026-09-16 결정: 기간 파라미터는 이번 섹션 범위 밖,
// 서버 기본값=이번 달을 그대로 씀). 실제 오늘 날짜의 "YY.MM"만 보여준다.
function currentMonthLabel() {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `${yy}.${mm}`
}

// GetMonthDashBoardCount의 "date"(yyyy-MM) → 차트 라벨("9월").
function monthLabel(date: string) {
  const month = Number(date.split('-')[1])
  return `${month}월`
}

// GetDashBoardGroupCount 응답(뿌리 노드 1개, children 재귀)을 OrgScopeTree가 쓰는
// {root, regions} 형태로 변환. 이 화면 조직은 최대 3계층(본청/지방청/경찰서)이라
// OrgScopeTree의 2단(regions + region.children) 렌더와 정확히 맞아떨어진다.
function toOrgScopeTree(node: OrgCountNode): { root: OrgScopeOption; regions: OrgRegion[] } {
  const root: OrgScopeOption = { id: String(node.groupSeq), label: node.groupName, count: node.totalCount }
  const regions: OrgRegion[] = node.children.map((child) => ({
    id: String(child.groupSeq),
    label: child.groupName,
    count: child.totalCount,
    children: child.children.map((grandchild) => ({
      id: String(grandchild.groupSeq),
      label: grandchild.groupName,
      count: grandchild.totalCount,
    })),
  }))
  return { root, regions }
}

function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const [sheetOpen, setSheetOpen] = useState(false)
  // null = 조직 트리 선택 안 함(서버 기본 스코프 = 소속 이하 전체, groupSeq 미전달).
  const [selectedScope, setSelectedScope] = useState<OrgScopeOption | null>(null)

  // 지역별 건수 순위(GetDashBoardTopOrder)는 경찰서 계정엔 의미가 없다(자기 한 줄뿐,
  // "순위" 개념이 안 맞음) — 경찰서 계정이면 애초에 호출하지 않고 화면에서도 뺀다
  // (2026-09-16 사용자 결정). 자리엔 접수 월별 추이를 대신 넣는다.
  const includeTopOrder = user?.role !== '경찰서'
  const groupSeqParam = selectedScope ? Number(selectedScope.id) : undefined

  // 조직 트리 구조는 로그인 계정 기본 스코프로 딱 한 번만 불러와 고정한다(선택할
  // 때마다 다시 안 부름) — 그래야 드릴다운해도 상위 계층이 트리에서 안 사라지고,
  // "전국" 라벨 판정도 매번 좁아지는 뿌리가 아니라 이 고정된 root를 기준으로 한다.
  const orgTreeQuery = useQuery({ queryKey: ['dashboard-org-tree'], queryFn: getOrgTree })
  const { root, regions } = useMemo(
    () => (orgTreeQuery.data ? toOrgScopeTree(orgTreeQuery.data) : { root: null, regions: [] as OrgRegion[] }),
    [orgTreeQuery.data],
  )

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', groupSeqParam, includeTopOrder],
    queryFn: () => getDashboardBundle(groupSeqParam, includeTopOrder),
    // 조직 트리에서 다른 노드를 고를 때마다 쿼리 키가 바뀌는데, 매번 전체 화면이
    // "불러오는 중..."으로 통째로 사라지면 UX가 나쁘다. 이전 데이터를 유지한 채
    // 백그라운드로 갱신 — 최초 진입 시에만 로딩 화면을 본다.
    placeholderData: keepPreviousData,
  })

  const bundle = dashboardQuery.data
  const scope = selectedScope ?? root

  const handleSelect = (option: OrgScopeOption) => {
    // 루트를 다시 고르면 기본 스코프로 되돌린다(groupSeq 미전달과 동일 결과).
    setSelectedScope(option.id === root?.id ? null : option)
  }
  const handlePickInSheet = (option: OrgScopeOption) => {
    handleSelect(option)
    setSheetOpen(false)
  }

  if (orgTreeQuery.isLoading || dashboardQuery.isLoading || !bundle || !scope || !root) {
    return <p className="py-16 text-center text-sm text-muted-foreground">불러오는 중...</p>
  }
  if (orgTreeQuery.isError || dashboardQuery.isError) {
    return <p className="py-16 text-center text-sm text-destructive">대시보드를 불러오지 못했습니다</p>
  }

  const byStatus: Record<(typeof VISIBLE_STATUSES)[number], number> = {
    접수: bundle.counts.receipt,
    배정: bundle.counts.assignment,
    경호중: bundle.counts.inprogress,
    경호완료: bundle.counts.complete,
  }
  // 히어로 "전체 접수건" 수치는 조직 트리 쪽(GetDashBoardGroupCount)이 아니라 이
  // 스코프별 상태별 건수 합계를 쓴다 — 두 API의 값이 같음을 프로브로 확인했고,
  // 트리는 위에서 고정해뒀으니 선택된 노드의 최신 값은 여기서 가져오는 쪽이 맞다.
  const totalCount = bundle.counts.total
  // 안전조치 대상(GetDashBoardSummaryCount)은 배정·경호중·경호완료만이라(접수 제외)
  // 전체 total 대신 이 세 상태 합을 "전체 N건 중" 분모로 쓴다.
  const measureTarget = bundle.counts.assignment + bundle.counts.inprogress + bundle.counts.complete

  const ageGroups = bundle.ageGroups.map((g) => ({ ...AGE_GROUP_META[g.ageGroup], count: g.count }))
  const ageDonutData = ageGroups.map((group) => ({ name: group.label, value: group.count, color: group.color }))
  const genderSplit = [
    { label: '남성', count: bundle.maleCount, color: '#2563eb' },
    { label: '여성', count: bundle.femaleCount, color: '#ec4899' },
  ]
  const monthlyTrend = bundle.monthly.map((row) => ({ month: monthLabel(row.date), count: row.total }))
  const safetyMeasures = [
    { name: '맞춤형 순찰', count: bundle.summary.customized },
    { name: '스마트워치', count: bundle.summary.watch },
    { name: '임시숙소', count: bundle.summary.accommodation },
    { name: 'CCTV', count: bundle.summary.cctv },
  ]
  const regionRanking = (bundle.topOrder ?? []).map((row) => ({ name: row.groupName, count: row.count }))
  // 순위 단위는 로그인 role이 아니라 "지금 고른 조회범위의 꼭대기"로 정해진다(API
  // 설명 그대로) — 본청이 자기 루트에 있을 때만 지방청 단위, 그 밖(본청이 특정
  // 지방청을 고르거나 지역청 계정)은 전부 경찰서 단위(2026-09-16 실측으로 확인한
  // 버그 수정 — 이전엔 role만 보고 고정해서 본청이 지방청을 드릴다운해도 라벨이
  // "지방청"에 머물러 있었음).
  const rankingUnitLabel = scope.id === root.id && user?.role === '본청' ? '지방청' : '경찰서'

  const scopeLabel = scope.id === root.id && user?.role === '본청' ? '전국' : scope.label

  return (
    <>
      {/* ============ 모바일 (xl 미만) ============ */}
      <main data-testid="dashboard-mobile" className="flex flex-col xl:hidden">
        {/* 히어로 — 인사말+월 선택(장식용)+조회범위 pill+KPI */}
        <div className="flex flex-col gap-5 bg-gradient-to-b from-[#243b5c] via-[#16213a] to-[#0f172a] px-4 pt-6 pb-16">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-300">
              안녕하세요, {user?.name} 담당자님
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200">
              {currentMonthLabel()}
              <ChevronDown className="size-3" />
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/10 py-1.5 pr-3 pl-3.5 text-xs font-semibold text-slate-200"
            >
              <span className="size-1.5 rounded-full bg-blue-400" />
              {scopeLabel}
              <ChevronDown className="size-3.5 text-blue-300" />
            </button>
            <div className="mt-1 flex items-baseline gap-2">
              <span data-testid="hero-scope-count" className="text-4xl font-bold tracking-tight text-white">
                {totalCount}
              </span>
              <span className="text-base font-semibold text-blue-300">건</span>
            </div>
            <span className="text-xs font-medium text-slate-500">
              경호중 {byStatus.경호중}건 진행 중
            </span>
          </div>
        </div>

        {/* 히어로 위로 겹치는 통계 카드 영역 */}
        <div className="-mt-10 flex flex-col gap-3 px-4 pb-28">
          <Card>
            <CardContent className="flex flex-col gap-3.5">
              <CardTitle>상태별 현황</CardTitle>
              <div className="grid grid-cols-2 gap-2.5">
                {VISIBLE_STATUSES.map((status) => {
                  const Icon = STATUS_ICON[status]
                  return (
                    <div key={status} className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Icon className="size-3" />
                        <span className={cn('size-1.5 rounded-full', STATUS_DOT_COLOR[status])} />
                        {status}
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {byStatus[status]}
                        <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">건</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {includeTopOrder && (
            <Card>
              <CardContent className="flex flex-col gap-3">
                <CardTitle>지역별 건수 순위</CardTitle>
                <RankedBarChart data={regionRanking} height={200} yAxisWidth={74} marginRight={20} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="flex flex-col gap-2">
              <CardTitle>이번달 신규 접수</CardTitle>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{byStatus.접수}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  건 · 평균 경호기간 {bundle.avgGuardDays}일
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3.5">
              <CardTitle>연령·성별 비율</CardTitle>
              <div className="flex flex-col items-center gap-3.5">
                <RatioDonut data={ageDonutData} total={totalCount} size={112} />
                <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-2.5">
                  {ageGroups.map((group) => (
                    <span
                      key={group.label}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground/80"
                    >
                      <span className={cn('size-2.5 rounded-sm', group.dot)} />
                      {group.label} {pct(group.count, totalCount)}%
                    </span>
                  ))}
                </div>
              </div>
              <GenderSplitBar data={genderSplit} total={totalCount} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3">
              <CardTitle>
                접수 월별 추이 <span className="text-[11px] font-normal text-muted-foreground">· 최근 6개월</span>
              </CardTitle>
              <MonthlyTrendChart data={monthlyTrend} height={170} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3.5">
              <CardTitle>
                안전조치 항목별 적용률{' '}
                <span className="text-[11px] font-normal text-muted-foreground">
                  · 전체 {measureTarget}건 중 · 1건당 중복 적용
                </span>
              </CardTitle>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                {safetyMeasures.map((item) => (
                  <div key={item.name} className="flex items-center gap-3.5">
                    <GaugeRing percent={pct(item.count, measureTarget)} size={80} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[12px] font-medium text-muted-foreground">{item.name}</span>
                      <span className="text-[18px] font-bold text-foreground">
                        {item.count}
                        <span className="ml-0.5 text-[12px] font-medium text-muted-foreground">건</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[74vh] rounded-t-3xl p-0 xl:hidden">
          <SheetHeader className="pb-2">
            <span className="text-xs text-muted-foreground">조회범위 선택</span>
            <SheetTitle>조직 계층</SheetTitle>
          </SheetHeader>
          {/* min-h-0: flex-col 안 flex-1 아이템은 기본 min-height:auto라
              내용 크기만큼 커져버려서 overflow-y-auto가 무시된다(dialog.tsx의
              동일 패턴 참고) — 없으면 조직 트리가 길어져도 시트 안에서 안
              잘리고 그냥 다 펼쳐짐. OrgScopeTree에도 shrink-0을 줘야 하는데,
              안 그러면 이 컨테이너의 유일한 자식이라도 flex-shrink:1 기본값
              때문에 넘치는 대신 눌려서(찌그러져서) 줄어들어버린다. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            <OrgScopeTree
              root={root}
              regions={regions}
              selectedId={scope.id}
              onSelect={handlePickInSheet}
              defaultExpandedId={regions[0]?.id}
              className="shrink-0"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ============ 데스크톱 (xl 이상) ============ */}
      {/* 화면 전체가 100% 배율에서 너무 확대돼 보인다는 피드백으로 히어로/카드/
          차트 치수를 전부 0.9배 스케일(브라우저 90% 줌으로 보던 비율)로
          축소함(2026-09-15). 좌측 OrgScopeTree는 모바일 바텀시트와 공유하는
          컴포넌트라 내부 폰트/행 높이는 그대로 두고 감싸는 aside 폭/패딩만
          줄였다. */}
      {/* xl:h-screen(고정, min-h 아님)이라야 아래 aside/메인 두 개의
          overflow-y-auto가 각자 독립 스크롤로 실제 작동한다 — min-h-screen이면
          이 div 자체가 콘텐츠 높이만큼 늘어나버려서 내부 스크롤 대신 페이지
          전체(윈도우)가 스크롤됨(2026-09-15 확인). Sidebar.tsx의 h-screen 레일과
          같은 패턴. 거기에 더해 aside/메인 각각의 overflow-y-auto 컨테이너에도
          min-h-0을 줘야 한다 — flex-col 안 flex-1 아이템 기본값(min-height:auto)이
          내용 크기만큼 부모를 밀어내는 문제라 h-screen만으론 부족함(위 시트와
          동일 원인). 그리고 그 안의 실제 콘텐츠(OrgScopeTree, 카드들)에도
          shrink-0이 필요함 — 안 그러면 flex-shrink 기본값 1 때문에 넘치는 대신
          컨테이너 높이에 맞춰 짜부라들어서 스크롤이 아예 안 생긴다. */}
      <div data-testid="dashboard-desktop" className="hidden xl:flex xl:h-screen">
        <aside className="flex w-[270px] shrink-0 flex-col border-r border-border bg-card">
          <div className="border-b border-border px-[18px] pt-[18px] pb-[13px]">
            <div className="text-[11px] text-muted-foreground">조회범위</div>
            <div className="text-[14px] font-bold text-foreground">조직 계층</div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-[11px] scrollbar-dark">
            <OrgScopeTree
              root={root}
              regions={regions}
              selectedId={scope.id}
              onSelect={handleSelect}
              defaultExpandedId={regions[0]?.id}
              className="shrink-0"
            />
          </div>
        </aside>

        {/* 여기 하나가 우측 전체(히어로+카드) 스크롤 영역 — aside 트리 스크롤과는
            완전히 별개. 전에는 히어로는 고정해두고 카드 영역만 따로 스크롤되게
            해놨었는데, 그게 아니라 "aside vs 우측 대시보드 전체"로 나누는
            거였다고 정정받음(2026-09-15). 그래서 overflow-y-auto를 이 컬럼
            자체로 올리고, 안쪽 히어로/카드 래퍼는 그냥 shrink-0만 줘서 순서대로
            쌓이다 넘치면 이 컬럼이 통째로 스크롤되게 바꿈. */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto scrollbar-dark">
          <div className="shrink-0 flex items-start justify-between bg-gradient-to-b from-[#243b5c] via-[#16213a] to-[#0f172a] px-[32px] pt-[29px] pb-[72px]">
            <div className="flex flex-col gap-[14px]">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-blue-300">
                  안녕하세요, {user?.name} 담당자님
                </span>
                <span className="text-[22px] font-bold tracking-tight text-white">오늘의 전체현황</span>
              </div>
              <div className="flex items-baseline gap-[9px]">
                <span className="text-[13px] font-medium text-slate-400">
                  전체 접수건 · {scopeLabel}
                </span>
                <span
                  data-testid="hero-scope-count"
                  className="text-[40px] leading-none font-bold tracking-tight text-white"
                >
                  {totalCount}
                </span>
                <span className="text-[14px] font-semibold text-blue-300">건</span>
                <span className="ml-[5px] text-[13px] font-medium text-slate-500">
                  경호중 {byStatus.경호중}건 진행 중 · 신규 {byStatus.접수}건
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-[7px] rounded-lg border border-white/15 bg-white/10 px-[14px] py-[9px] text-[13px] font-semibold text-slate-200">
              조회월 {currentMonthLabel()}
              <ChevronDown className="size-[13px] text-slate-300" />
            </div>
          </div>

          <div className="-mt-[43px] flex shrink-0 flex-col gap-[14px] px-[32px] pb-[32px]">
            <div className="flex gap-[14px]">
              {VISIBLE_STATUSES.map((status) => {
                const Icon = STATUS_ICON[status]
                return (
                  <Card key={status} className="flex-1">
                    <CardContent className="flex flex-col gap-[11px]">
                      <span className="inline-flex items-center gap-[5px] text-[13px] font-medium text-muted-foreground">
                        <Icon className="size-[13px]" />
                        <span className={cn('size-[9px] rounded-full', STATUS_DOT_COLOR[status])} />
                        {status}
                      </span>
                      <span className="text-[27px] font-bold text-foreground">
                        {byStatus[status]}
                        <span className="ml-1 text-[13px] font-medium text-muted-foreground">건</span>
                      </span>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* 평균경호기간을 위 상태별 카드 행에서 분리하고 신규접수와 묶어
                얇고 긴 카드 2개로 재배치(2026-09-15 사용자 요청) — 세로 스택
                대신 라벨/값을 한 줄에 나란히 둬 카드 높이를 줄임. */}
            <div className="flex gap-[14px]">
              <Card className="flex-1">
                <CardContent className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-muted-foreground">이번달 신규 접수</span>
                  <span className="text-[22px] font-bold text-foreground">
                    {byStatus.접수}
                    <span className="ml-1 text-[13px] font-medium text-muted-foreground">건</span>
                  </span>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-muted-foreground">평균 경호기간</span>
                  <span className="text-[22px] font-bold text-foreground">
                    {bundle.avgGuardDays}
                    <span className="ml-1 text-[13px] font-medium text-muted-foreground">일</span>
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* 경찰서 계정은 지역별 건수 순위가 의미 없어(자기 한 줄뿐) 이 자리에
                접수 월별 추이를 대신 넣는다(2026-09-16 결정) — 본청/지역청은
                원래대로 지역별 건수 순위 + 아래 별도 월별 추이 행 유지. */}
            <div className="flex items-stretch gap-[14px]">
              <Card className="flex-[1.3]">
                <CardContent className="flex flex-col gap-[14px]">
                  {includeTopOrder ? (
                    <>
                      <CardTitle className="text-[13px]">
                        지역별 건수 순위{' '}
                        <span className="text-[11px] font-normal text-muted-foreground">· {rankingUnitLabel}</span>
                      </CardTitle>
                      <RankedBarChart data={regionRanking} height={216} />
                    </>
                  ) : (
                    <>
                      <CardTitle className="text-[13px]">
                        접수 월별 추이{' '}
                        <span className="text-[11px] font-normal text-muted-foreground">
                          · 신규 접수 · 최근 6개월
                        </span>
                      </CardTitle>
                      <MonthlyTrendChart data={monthlyTrend} height={216} />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="flex-1">
                <CardContent className="flex flex-1 flex-col gap-[14px]">
                  <CardTitle className="text-[13px]">연령·성별 비율</CardTitle>
                  <div className="flex flex-1 items-center justify-center gap-[25px]">
                    <RatioDonut data={ageDonutData} total={totalCount} size={117} />
                    <div className="flex flex-col gap-[9px]">
                      {ageGroups.map((group) => (
                        <span
                          key={group.label}
                          className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground/80"
                        >
                          <span className={cn('size-[10px] rounded-sm', group.dot)} />
                          {group.label} {group.count}건 ({pct(group.count, totalCount)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                  <GenderSplitBar data={genderSplit} total={totalCount} />
                </CardContent>
              </Card>
            </div>

            {includeTopOrder && (
              <Card>
                <CardContent className="flex flex-col gap-[11px]">
                  <CardTitle className="text-[13px]">
                    접수 월별 추이{' '}
                    <span className="text-[11px] font-normal text-muted-foreground">· 신규 접수 · 최근 6개월</span>
                  </CardTitle>
                  <MonthlyTrendChart data={monthlyTrend} height={200} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="flex flex-col gap-[14px]">
                <CardTitle className="text-[13px]">
                  안전조치 항목별 적용률{' '}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    · 전체 {measureTarget}건 중 · 1건당 중복 적용
                  </span>
                </CardTitle>
                <div className="flex items-center justify-between gap-4">
                  {safetyMeasures.map((item) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <GaugeRing percent={pct(item.count, measureTarget)} size={92} />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-medium text-muted-foreground">{item.name}</span>
                        <span className="text-[20px] font-bold text-foreground">
                          {item.count}
                          <span className="ml-0.5 text-[13px] font-medium text-muted-foreground">건</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

export default DashboardPage
