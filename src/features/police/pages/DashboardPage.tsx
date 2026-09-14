import { ChevronDown, ChevronRight, CheckCircle2, Inbox, Shield, UserCheck } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAuthStore } from '../../auth/store/authStore'
import type { SecurityCaseStatus } from '../types/securityCase'

// [본청/지역청/경찰서] 홈 대시보드 — docs/mobile-ui/홈 대시보드 (모바일).dc.html
// 그대로 채운 신규 화면(목업 anchor 없음). 기존 원본 목업(docs/PGMS_UI_mock.dc.html)
// Screen 1/1m·2/2m의 "조직 트리 드릴다운" 설계는 이 화면으로 전면 교체하기로
// 결정(2026-09-14, 사용자 확인) — 그쪽 설계는 폐기.
//
// 집계 API가 아직 없어(loop-backend 미착수) 전부 정적 더미 데이터다. 실 연동
// 시 이 파일의 상수들을 쿼리 결과로 교체하면 된다. 월 선택 pill도 그 때까지는
// 클릭 동작 없는 장식용.
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

// 더미 집계 — 목업 실측값 그대로.
const SUMMARY = {
  month: '26.02',
  totalCount: 158,
  activeCount: 88,
  byStatus: { 접수: 18, 배정: 34, 경호중: 88, 경호완료: 18 } satisfies Record<
    (typeof VISIBLE_STATUSES)[number],
    number
  >,
  regionRanking: [
    { name: '서울지방청', count: 41 },
    { name: '경기남부청', count: 37 },
    { name: '부산지방청', count: 22 },
  ],
  newThisMonth: 42,
  avgDurationDays: 14.5,
  ratio: { 접수: 11, 배정: 22, 경호중: 56, 경호완료: 11 } satisfies Record<
    (typeof VISIBLE_STATUSES)[number],
    number
  >,
}

const maxRegionCount = Math.max(...SUMMARY.regionRanking.map((r) => r.count))

function DashboardPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <main className="flex flex-col">
      {/* 히어로 — 인사말+월 선택(장식용)+전체 접수건 KPI */}
      <div className="flex flex-col gap-5 bg-gradient-to-b from-[#243b5c] via-[#16213a] to-[#0f172a] px-4 pt-6 pb-16 sm:px-8 sm:pt-8 sm:pb-20">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <span className="text-sm font-medium text-blue-300">
            안녕하세요, {user?.name} 담당자님
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200">
            {SUMMARY.month}
            <ChevronDown className="size-3" />
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          <span className="text-sm font-medium text-slate-400">전체 접수건 · 전국</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-white">{SUMMARY.totalCount}</span>
            <span className="text-base font-semibold text-blue-300">건</span>
            <ChevronRight className="ml-0.5 size-4.5 text-slate-500" />
          </div>
          <span className="text-xs font-medium text-slate-500">
            경호중 {SUMMARY.activeCount}건 진행 중
          </span>
        </div>
      </div>

      {/* 히어로 위로 겹치는 통계 카드 영역 */}
      <div className="mx-auto -mt-10 flex w-full max-w-4xl flex-col gap-3 px-4 pb-28 sm:grid sm:grid-cols-2 sm:px-8 sm:pb-8 xl:pb-8">
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
            <div className="flex flex-col gap-2.5">
              {SUMMARY.regionRanking.map((region, index) => (
                <div key={region.name} className="flex items-center gap-2.5">
                  <span className="w-3.5 text-xs font-bold text-muted-foreground">{index + 1}</span>
                  <span className="w-[74px] shrink-0 text-xs font-medium text-foreground/80">
                    {region.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${(region.count / maxRegionCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-bold text-foreground">
                    {region.count}
                  </span>
                </div>
              ))}
            </div>
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
          <CardContent className="flex flex-col items-center gap-3.5">
            <CardTitle className="self-start">상태별 비율</CardTitle>
            <div
              className="flex size-28 items-center justify-center rounded-full"
              style={{
                background:
                  'conic-gradient(var(--status-received) 0deg 41deg, var(--status-assigned) 41deg 118deg, var(--status-active) 118deg 318deg, var(--status-completed) 318deg 360deg)',
              }}
            >
              <div className="flex size-17 items-center justify-center rounded-full bg-card text-xs font-bold text-foreground">
                {SUMMARY.totalCount}건
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-2.5">
              {VISIBLE_STATUSES.map((status) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/80"
                >
                  <span className={cn('size-2 rounded-sm', STATUS_DOT_COLOR[status])} />
                  {status} {SUMMARY.ratio[status]}%
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default DashboardPage
