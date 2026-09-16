import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, SquarePen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import DetailHeader from '@/shared/components/DetailHeader'
import StatusBadge from '@/shared/components/StatusBadge'
import { resolveDeployStatus } from '@/shared/lib/deployStatus'
import { getWorkerSchedule, listWorkers, type Worker, type WorkerScheduleCase } from '../api/workers'
import EditWorkerDialog from '../components/EditWorkerDialog'
import DeleteWorkerDialog from '../components/DeleteWorkerDialog'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function hhmm(isoLike: string) {
  return isoLike.slice(11, 16)
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${dateStr.slice(5).replace('-', '.')} (${WEEKDAYS[d.getDay()]})`
}

function diffHours(startDt: string, endDt: string) {
  const ms = new Date(endDt).getTime() - new Date(startDt).getTime()
  return ms > 0 ? ms / 3_600_000 : 0
}

function fmtHours(h: number) {
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

// 같은 날 동일한 근무(date·startDt·endDt·isWork)가 중복으로 오는 경우가 있어 제거한다
// (경호건별 근무 이력에서도 관측된 적 있는 패턴 — schdules 오타 시절과 같은 이유로 방어 유지).
function dedupeShifts(schedules: WorkerScheduleCase['schedules']) {
  const seen = new Set<string>()
  return schedules.filter((s) => {
    const key = `${s.date}|${s.startDt}|${s.endDt}|${s.isWork}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// 같은 날짜에 근무가 여러 건(오전/오후 등) 나뉘어 올 수 있어 날짜별로 묶는다.
function groupByDate(schedules: WorkerScheduleCase['schedules']) {
  const map = new Map<string, WorkerScheduleCase['schedules']>()
  for (const s of dedupeShifts(schedules)) {
    if (!map.has(s.date)) map.set(s.date, [])
    map.get(s.date)!.push(s)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

// 경호건 하나의 근무 이력 — 날짜별 묶음과 합계.
function summarizeCase(c: WorkerScheduleCase) {
  const days = groupByDate(c.schedules)
  let workDays = 0
  let offDays = 0
  let totalHours = 0
  for (const [, shifts] of days) {
    const working = shifts.filter((s) => s.isWork)
    if (working.length > 0) {
      workDays += 1
      for (const s of working) totalHours += diffHours(s.startDt, s.endDt)
    } else if (shifts.length > 0) {
      offDays += 1
    }
  }
  const dates = days.map(([date]) => date)
  return {
    days,
    workDays,
    offDays,
    totalHours,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
  }
}

function CaseCard({
  securityCase,
  expanded,
  onToggle,
}: {
  securityCase: WorkerScheduleCase
  expanded: boolean
  onToggle: () => void
}) {
  const summary = summarizeCase(securityCase)
  const dateRange =
    summary.firstDate === summary.lastDate
      ? fmtDate(summary.firstDate).split(' ')[0]
      : `${fmtDate(summary.firstDate).split(' ')[0]} ~ ${fmtDate(summary.lastDate).split(' ')[0]}`

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 text-sm font-bold text-foreground">
            {securityCase.mgmtNo} · {securityCase.guardCode}
          </span>
          <span className="truncate text-xs text-muted-foreground">{dateRange}</span>
        </div>
        <span className="shrink-0 text-xs font-semibold text-foreground tabular-nums">
          {summary.workDays}일 · {fmtHours(summary.totalHours)}시간
        </span>
        <StatusBadge
          status={resolveDeployStatus(securityCase.statusName).status}
          className="shrink-0"
        />
      </button>

      {expanded && (
        <div className="divide-y divide-border/60 border-t border-border px-4">
          {summary.days.map(([date, shifts]) => {
            const working = shifts.filter((s) => s.isWork)
            const off = working.length === 0
            const dayHours = working.reduce((h, s) => h + diffHours(s.startDt, s.endDt), 0)
            return (
              <div key={date} className="flex items-center gap-3 py-2.5 text-sm">
                <span
                  className={'h-7 w-1 shrink-0 rounded-full ' + (off ? 'bg-border' : 'bg-blue-500')}
                />
                <span
                  className={
                    'w-24 shrink-0 ' + (off ? 'text-muted-foreground' : 'font-medium text-foreground')
                  }
                >
                  {fmtDate(date)}
                </span>
                <span className="min-w-0 flex-1 text-foreground/80">
                  {off ? (
                    <span className="text-muted-foreground">휴무</span>
                  ) : (
                    working.map((s, si) => (
                      <span key={si}>
                        {si > 0 && <span className="text-muted-foreground"> · </span>}
                        {hhmm(s.startDt)} ~ {hhmm(s.endDt)}
                      </span>
                    ))
                  )}
                </span>
                {!off && (
                  <span className="shrink-0 text-xs font-semibold text-foreground tabular-nums">
                    {fmtHours(dayHours)}시간
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editTarget, setEditTarget] = useState<Worker | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null)

  const workersQuery = useQuery({ queryKey: ['workers'], queryFn: listWorkers })
  const scheduleQuery = useQuery({
    queryKey: ['worker-schedule', id],
    queryFn: () => getWorkerSchedule(id!),
    enabled: Boolean(id),
  })

  const worker = workersQuery.data?.find((w) => w.id === id)

  // 최근 근무한 경호건이 위로 오게 정렬(마지막 근무일 기준 내림차순).
  const cases = useMemo(() => {
    const raw = scheduleQuery.data?.cases ?? []
    return [...raw].sort((a, b) => {
      const lastA = summarizeCase(a).lastDate ?? ''
      const lastB = summarizeCase(b).lastDate ?? ''
      return lastB.localeCompare(lastA)
    })
  }, [scheduleQuery.data])

  // 클릭한 경호건만 펼친다 — 기본은 전부 접힌 카드 리스트.
  const [expandedCaseSeqs, setExpandedCaseSeqs] = useState<Set<number>>(new Set())
  function toggleCase(caseSeq: number) {
    setExpandedCaseSeqs((prev) => {
      const next = new Set(prev)
      if (next.has(caseSeq)) next.delete(caseSeq)
      else next.add(caseSeq)
      return next
    })
  }

  const summary = useMemo(() => {
    let workedDays = 0
    let offDays = 0
    let totalHours = 0
    for (const c of cases) {
      const s = summarizeCase(c)
      workedDays += s.workDays
      offDays += s.offDays
      totalHours += s.totalHours
    }
    return { workedDays, offDays, totalHours }
  }, [cases])

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      {/* 모바일 목업(docs/mobile-ui) 헤더 패턴 — 경찰 경호상세와 동일 적용 */}
      <div className="flex flex-col gap-3 xl:contents">
        <DetailHeader
          breadcrumb={worker ? `근무자 / ${worker.name}` : '근무자'}
          fallbackTo="/admin/workers"
        />

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">{worker?.name ?? '근무자'}</h1>
          {worker && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs font-medium text-muted-foreground">
                사번 {worker.employeeId}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* 기본정보 */}
        <div className="flex flex-col gap-3 xl:w-72 xl:shrink-0">
          <div className="rounded-xl border border-border bg-card p-5.5">
            <div className="mb-2 text-sm font-bold text-foreground">기본정보</div>
            {workersQuery.isLoading && (
              <div className="divide-y divide-border/60">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-2">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            )}
            {workersQuery.isSuccess && !worker && (
              <p className="py-4 text-sm text-destructive">근무자를 찾을 수 없습니다</p>
            )}
            {worker && (
              <div className="divide-y divide-border/60">
                <InfoRow label="이름" value={worker.name} />
                <InfoRow label="사번" value={worker.employeeId} />
                <InfoRow label="부서" value={worker.department || '-'} />
                <InfoRow label="연락처" value={worker.phone || '-'} />
              </div>
            )}
          </div>

          {worker && (
            <div className="flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(worker)}
                className="flex-1"
              >
                <SquarePen />
                정보수정
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteTarget(worker)}
                className="flex-1"
              >
                <Trash2 />
                삭제
              </Button>
            </div>
          )}
        </div>

        {/* 근무 이력 */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="text-sm font-bold text-foreground">근무 이력</div>

          {scheduleQuery.isLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card px-4 py-3">
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="mt-1.5 h-3 w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="근무일" value={`${summary.workedDays}일`} />
              <StatTile label="총 근무시간" value={`${fmtHours(summary.totalHours)}시간`} />
              <StatTile label="휴무" value={`${summary.offDays}일`} />
            </div>
          )}

          {scheduleQuery.isLoading && (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <Skeleton className="size-3.5 shrink-0 rounded-sm" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="ml-auto h-4 w-16 shrink-0" />
                  <Skeleton className="h-5 w-12 shrink-0 rounded-md" />
                </div>
              ))}
            </div>
          )}
          {scheduleQuery.isError && (
            <p className="py-8 text-center text-sm text-destructive">
              근무 이력을 불러오지 못했습니다
            </p>
          )}
          {scheduleQuery.isSuccess && cases.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">근무 이력이 없습니다</p>
          )}

          <div className="flex flex-col gap-2.5">
            {cases.map((c) => (
              <CaseCard
                key={c.caseSeq}
                securityCase={c}
                expanded={expandedCaseSeqs.has(c.caseSeq)}
                onToggle={() => toggleCase(c.caseSeq)}
              />
            ))}
          </div>
        </div>
      </div>

      <EditWorkerDialog target={editTarget} onOpenChange={(open) => !open && setEditTarget(null)} />
      <DeleteWorkerDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onSuccess={() => navigate('/admin/workers')}
      />
    </main>
  )
}

export default WorkerDetailPage
