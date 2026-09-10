import { useMemo } from 'react'
import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import DetailHeader from '@/shared/components/DetailHeader'
import { getWorkerSchedule, listWorkers, type WorkerScheduleDay } from '../api/workers'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function hhmm(isoLike: string) {
  return isoLike.slice(11, 16)
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${dateStr.slice(5).replace('-', '.')} (${WEEKDAYS[d.getDay()]})`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  return `${y}년 ${Number(m)}월`
}

function diffHours(startDt: string, endDt: string) {
  const ms = new Date(endDt).getTime() - new Date(startDt).getTime()
  return ms > 0 ? ms / 3_600_000 : 0
}

function fmtHours(h: number) {
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}

// 같은 날 동일한 근무(startDt·endDt·isWork)가 중복으로 오는 경우가 있어 제거한다.
function dedupeShifts(day: WorkerScheduleDay) {
  const seen = new Set<string>()
  return day.schdules.filter((s) => {
    const key = `${s.startDt}|${s.endDt}|${s.isWork}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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

function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>()

  const workersQuery = useQuery({ queryKey: ['workers'], queryFn: listWorkers })
  const scheduleQuery = useQuery({
    queryKey: ['worker-schedule', id],
    queryFn: () => getWorkerSchedule(id!),
    enabled: Boolean(id),
  })

  const worker = workersQuery.data?.find((w) => w.id === id)

  const days = useMemo(() => {
    const raw = scheduleQuery.data ?? []
    return [...raw]
      .sort((a, b) => a.dates.localeCompare(b.dates))
      .map((d) => ({ ...d, shifts: dedupeShifts(d) }))
  }, [scheduleQuery.data])

  const summary = useMemo(() => {
    let workedDays = 0
    let offDays = 0
    let totalHours = 0
    for (const d of days) {
      const working = d.shifts.filter((s) => s.isWork)
      if (working.length > 0) {
        workedDays += 1
        for (const s of working) totalHours += diffHours(s.startDt, s.endDt)
      } else if (d.shifts.length > 0) {
        offDays += 1
      }
    }
    return { workedDays, offDays, totalHours }
  }, [days])

  const months = useMemo(() => {
    const map = new Map<string, typeof days>()
    for (const d of days) {
      const key = d.dates.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return [...map.entries()]
  }, [days])

  return (
    <main className="flex flex-col gap-4 p-4 pb-28 sm:p-8 sm:pb-28 xl:pb-8">
      <DetailHeader
        breadcrumb={worker ? `근무자 / ${worker.name}` : '근무자'}
        fallbackTo="/admin/workers"
      />

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">{worker?.name ?? '근무자'}</h1>
        {worker && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            사번 {worker.employeeId}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* 기본정보 */}
        <div className="rounded-xl border border-border bg-card p-5.5 xl:w-72 xl:shrink-0">
          <div className="mb-2 text-sm font-bold text-foreground">기본정보</div>
          {workersQuery.isLoading && (
            <p className="py-4 text-sm text-muted-foreground">불러오는 중...</p>
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

        {/* 근무 이력 */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="text-sm font-bold text-foreground">근무 이력</div>

          <div className="grid grid-cols-3 gap-3">
            <StatTile label="근무일" value={`${summary.workedDays}일`} />
            <StatTile label="총 근무시간" value={`${fmtHours(summary.totalHours)}시간`} />
            <StatTile label="휴무" value={`${summary.offDays}일`} />
          </div>

          {scheduleQuery.isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
          )}
          {scheduleQuery.isError && (
            <p className="py-8 text-center text-sm text-destructive">
              근무 이력을 불러오지 못했습니다
            </p>
          )}
          {scheduleQuery.isSuccess && days.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">근무 이력이 없습니다</p>
          )}

          {months.map(([key, monthDays]) => {
            const monthHours = monthDays.reduce(
              (sum, d) =>
                sum +
                d.shifts
                  .filter((s) => s.isWork)
                  .reduce((h, s) => h + diffHours(s.startDt, s.endDt), 0),
              0,
            )
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3 pt-2 pb-0.5">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {monthLabel(key)}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {fmtHours(monthHours)}시간
                  </span>
                </div>
                {monthDays.map((d) => {
                  const working = d.shifts.filter((s) => s.isWork)
                  const off = working.length === 0
                  const dayHours = working.reduce(
                    (h, s) => h + diffHours(s.startDt, s.endDt),
                    0,
                  )
                  return (
                    <div
                      key={d.dates}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm"
                    >
                      <span
                        className={
                          'h-7 w-1 shrink-0 rounded-full ' +
                          (off ? 'bg-border' : 'bg-blue-500')
                        }
                      />
                      <span
                        className={
                          'w-24 shrink-0 ' +
                          (off ? 'text-muted-foreground' : 'font-medium text-foreground')
                        }
                      >
                        {fmtDate(d.dates)}
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
            )
          })}
        </div>
      </div>
    </main>
  )
}

export default WorkerDetailPage
