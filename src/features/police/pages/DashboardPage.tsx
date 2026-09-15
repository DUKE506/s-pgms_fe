import { useState } from 'react'
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
import { ORG_REGIONS, ORG_ROOT, scopeLabelFor, type OrgScopeOption } from '../data/orgScope'

// [본청/지역청/경찰서] 홈 대시보드 — 모바일: docs/mobile-ui/홈 대시보드 (모바일).dc.html,
// 데스크톱(xl 이상): docs/mobile-ui/홈 대시보드 (웹).dc.html. 두 목업이 레이아웃
// 자체가 달라(웹은 좌측 조직트리 사이드바 상시 노출 + 월별추이·안전조치 섹션
// 추가) Sidebar.tsx와 같은 방식으로 xl 기준 완전히 다른 두 트리를 CSS로
// 토글한다(하나의 JS 미디어쿼리 대신 hidden/xl:hidden 클래스로 분기).
//
// 집계 API가 아직 없어(loop-backend 미착수) 전부 정적 더미 데이터다. 실 연동
// 시 이 파일의 상수들을 쿼리 결과로 교체하면 된다. 월 선택 pill도 그 때까지는
// 클릭 동작 없는 장식용. 조직 트리 스코프 선택(scope state)은 실제로 동작하되
// 선택 시 표시되는 건수도 각 트리 노드에 미리 박아둔 더미값이다.
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

// 상태별 비율은 위 KPI 카드들과 중복이라 연령층 비율로 교체(2026-09-15 사용자
// 결정). 연령대는 순서가 있는 값이라 카테고리색이 아니라 순차(sequential) 블루
// 램프를 쓴다 — 처음엔 기존 --chart-1~5(무채색 그레이) 토큰을 재사용했는데
// 가장 밝은 단계가 흰 카드 배경에서 거의 안 보여서(L 0.87, 채도 0) 교체함.
const AGE_GROUPS = [
  { label: '10대 이하', count: 13, dot: 'bg-[#93c5fd]', color: '#93c5fd' },
  { label: '20대', count: 35, dot: 'bg-[#60a5fa]', color: '#60a5fa' },
  { label: '30대', count: 55, dot: 'bg-[#3b82f6]', color: '#3b82f6' },
  { label: '40대', count: 38, dot: 'bg-[#2563eb]', color: '#2563eb' },
  { label: '50대 이상', count: 17, dot: 'bg-[#1e40af]', color: '#1e40af' },
]

// 성별 비율 — 연령층과 같은 카드에 얹어서 인구통계 정보를 함께 보여줌
// (2026-09-15 사용자 요청). 합은 SUMMARY.totalCount(158)와 맞춤.
const GENDER_SPLIT = [
  { label: '남성', count: 87, color: '#2563eb' },
  { label: '여성', count: 71, color: '#ec4899' },
]

// 더미 집계 — 목업 실측값 그대로.
const SUMMARY = {
  month: '26.02',
  totalCount: 158,
  activeCount: 88,
  byStatus: { 접수: 18, 배정: 34, 경호중: 88, 경호완료: 18 } satisfies Record<
    (typeof VISIBLE_STATUSES)[number],
    number
  >,
  newThisMonth: 42,
  avgDurationDays: 14.5,
}

// 데스크톱은 top5+그 외, 모바일 카드는 이 중 top3만 사용(목업 그대로).
const REGION_RANKING = [
  { name: '서울지방청', count: 41 },
  { name: '경기남부청', count: 37 },
  { name: '부산지방청', count: 22 },
  { name: '인천지방청', count: 19 },
  { name: '대구지방청', count: 15 },
  { name: '그 외 13개', count: 24 },
]

// "그 달에 발생한 접수건" 추이(누적 총 건수 아님, 2026-09-15 사용자 명확화).
// 값 순위: 9월 > 12월 > 1월 > 2월 > 11월 > 10월 (같은 날 요청 — 우상향 일변도라
// 밋밋해 보이던 걸 곡선이 잘 보이도록 굴곡을 줌).
const MONTHLY_TREND = [
  { month: '9월', count: 158 },
  { month: '10월', count: 95 },
  { month: '11월', count: 108 },
  { month: '12월', count: 145 },
  { month: '1월', count: 132 },
  { month: '2월', count: 120 },
]

// 값 내림차순(docs/mobile-ui/안전조치 항목별 적용률.png 목업 순서 그대로,
// 2026-09-15). 각 항목은 전체 158건 중 그 조치가 적용된 건수/비율 —
// 한 건에 여러 조치가 동시에 걸릴 수 있어(중복 적용) 네 값의 합이 158을
// 넘는다. 게이지 링은 항목별로 독립된 0~100% 값이라 이 중복 데이터에도
// 문제없음(도넛/파이였다면 부분의 합이 100%를 넘어 의미가 깨졌을 것).
const SAFETY_MEASURES = [
  { name: '맞춤형 순찰', count: 96 },
  { name: '스마트워치', count: 72 },
  { name: '임시숙소', count: 41 },
  { name: 'CCTV', count: 28 },
]

function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const [scope, setScope] = useState<OrgScopeOption>(ORG_ROOT)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handlePickInSheet = (option: OrgScopeOption) => {
    setScope(option)
    setSheetOpen(false)
  }

  const ageDonutData = AGE_GROUPS.map((group) => ({
    name: group.label,
    value: group.count,
    color: group.color,
  }))

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
              {SUMMARY.month}
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
              {scopeLabelFor(scope)}
              <ChevronDown className="size-3.5 text-blue-300" />
            </button>
            <div className="mt-1 flex items-baseline gap-2">
              <span data-testid="hero-scope-count" className="text-4xl font-bold tracking-tight text-white">
                {scope.count}
              </span>
              <span className="text-base font-semibold text-blue-300">건</span>
            </div>
            <span className="text-xs font-medium text-slate-500">
              경호중 {SUMMARY.activeCount}건 진행 중
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
                        {SUMMARY.byStatus[status]}
                        <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">건</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3">
              <CardTitle>지역별 건수 순위</CardTitle>
              <RankedBarChart data={REGION_RANKING.slice(0, 3)} height={110} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2">
              <CardTitle>이번달 신규 접수</CardTitle>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">{SUMMARY.newThisMonth}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  건 · 평균 경호기간 {SUMMARY.avgDurationDays}일
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3.5">
              <CardTitle>연령·성별 비율</CardTitle>
              <div className="flex flex-col items-center gap-3.5">
                <RatioDonut data={ageDonutData} total={SUMMARY.totalCount} size={112} />
                <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-2.5">
                  {AGE_GROUPS.map((group) => (
                    <span
                      key={group.label}
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground/80"
                    >
                      <span className={cn('size-2.5 rounded-sm', group.dot)} />
                      {group.label} {Math.round((group.count / SUMMARY.totalCount) * 100)}%
                    </span>
                  ))}
                </div>
              </div>
              <GenderSplitBar data={GENDER_SPLIT} total={SUMMARY.totalCount} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3">
              <CardTitle>
                접수 월별 추이 <span className="text-[11px] font-normal text-muted-foreground">· 최근 6개월</span>
              </CardTitle>
              <MonthlyTrendChart data={MONTHLY_TREND} height={110} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3.5">
              <CardTitle>
                안전조치 항목별 적용률{' '}
                <span className="text-[11px] font-normal text-muted-foreground">
                  · 전체 {SUMMARY.totalCount}건 중 · 1건당 중복 적용
                </span>
              </CardTitle>
              <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                {SAFETY_MEASURES.map((item) => (
                  <div key={item.name} className="flex items-center gap-3.5">
                    <GaugeRing percent={Math.round((item.count / SUMMARY.totalCount) * 100)} size={80} />
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
              root={ORG_ROOT}
              regions={ORG_REGIONS}
              selectedId={scope.id}
              onSelect={handlePickInSheet}
              defaultExpandedId="seoul"
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
              root={ORG_ROOT}
              regions={ORG_REGIONS}
              selectedId={scope.id}
              onSelect={setScope}
              defaultExpandedId="seoul"
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
                  전체 접수건 · {scopeLabelFor(scope)}
                </span>
                <span
                  data-testid="hero-scope-count"
                  className="text-[40px] leading-none font-bold tracking-tight text-white"
                >
                  {scope.count}
                </span>
                <span className="text-[14px] font-semibold text-blue-300">건</span>
                <span className="ml-[5px] text-[13px] font-medium text-slate-500">
                  경호중 {SUMMARY.activeCount}건 진행 중 · 신규 {SUMMARY.newThisMonth}건
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-[7px] rounded-lg border border-white/15 bg-white/10 px-[14px] py-[9px] text-[13px] font-semibold text-slate-200">
              조회월 {SUMMARY.month}
              <ChevronDown className="size-[13px] text-slate-300" />
            </div>
          </div>

          <div className="-mt-[43px] flex shrink-0 flex-col gap-[14px] px-[32px] pb-[32px]">
            <div className="flex gap-[14px]">
              {VISIBLE_STATUSES.map((status) => (
                <Card key={status} className="flex-1">
                  <CardContent className="flex flex-col gap-[11px]">
                    <span className="inline-flex items-center gap-[5px] text-[13px] font-medium text-muted-foreground">
                      <span className={cn('size-[9px] rounded-full', STATUS_DOT_COLOR[status])} />
                      {status}
                    </span>
                    <span className="text-[27px] font-bold text-foreground">
                      {SUMMARY.byStatus[status]}
                      <span className="ml-1 text-[13px] font-medium text-muted-foreground">건</span>
                    </span>
                  </CardContent>
                </Card>
              ))}
              <Card className="flex-1">
                <CardContent className="flex flex-col gap-[11px]">
                  <span className="text-[13px] font-medium text-muted-foreground">평균 경호기간</span>
                  <span className="text-[27px] font-bold text-foreground">
                    {SUMMARY.avgDurationDays}
                    <span className="ml-1 text-[13px] font-medium text-muted-foreground">일</span>
                  </span>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-stretch gap-[14px]">
              <Card className="flex-[1.3]">
                <CardContent className="flex flex-col gap-[14px]">
                  <CardTitle className="text-[13px]">
                    지역별 건수 순위 <span className="text-[11px] font-normal text-muted-foreground">· 지방청</span>
                  </CardTitle>
                  <RankedBarChart data={REGION_RANKING} height={216} />
                </CardContent>
              </Card>

              <Card className="flex-1">
                <CardContent className="flex flex-1 flex-col gap-[14px]">
                  <CardTitle className="text-[13px]">연령·성별 비율</CardTitle>
                  <div className="flex flex-1 items-center justify-center gap-[25px]">
                    <RatioDonut data={ageDonutData} total={SUMMARY.totalCount} size={117} />
                    <div className="flex flex-col gap-[9px]">
                      {AGE_GROUPS.map((group) => (
                        <span
                          key={group.label}
                          className="inline-flex items-center gap-2 text-[13px] font-medium text-foreground/80"
                        >
                          <span className={cn('size-[10px] rounded-sm', group.dot)} />
                          {group.label} {group.count}건 ({Math.round((group.count / SUMMARY.totalCount) * 100)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                  <GenderSplitBar data={GENDER_SPLIT} total={SUMMARY.totalCount} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="flex flex-col gap-[11px]">
                <CardTitle className="text-[13px]">
                  접수 월별 추이{' '}
                  <span className="text-[11px] font-normal text-muted-foreground">· 신규 접수 · 최근 6개월</span>
                </CardTitle>
                <MonthlyTrendChart data={MONTHLY_TREND} height={200} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-[14px]">
                <CardTitle className="text-[13px]">
                  안전조치 항목별 적용률{' '}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    · 전체 {SUMMARY.totalCount}건 중 · 1건당 중복 적용
                  </span>
                </CardTitle>
                <div className="flex items-center justify-between gap-4">
                  {SAFETY_MEASURES.map((item) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <GaugeRing percent={Math.round((item.count / SUMMARY.totalCount) * 100)} size={92} />
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
