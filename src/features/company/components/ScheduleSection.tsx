import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Switch } from '@/components/ui/switch'
import { setPreMeeting } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { Worker } from '../api/workers'
import type { ScheduleDay, ScheduleGroup, SecurityCase } from '../../police/types/securityCase'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatDateWithWeekday(dateOnly: string) {
  const d = new Date(`${dateOnly}T00:00:00`)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd} (${WEEKDAYS[d.getDay()]})`
}

function workerName(workers: Worker[], workerId: string) {
  return workers.find((w) => w.id === workerId)?.name ?? workerId
}

function duration(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return ''
  let minutes = eh * 60 + em - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
}

function GroupCard({
  group,
  label,
  workers,
}: {
  group: ScheduleGroup
  label: string
  workers: Worker[]
}) {
  return (
    <div className="rounded-lg bg-muted/60 p-3.5">
      <div className="mb-2.5 text-xs font-semibold text-foreground">{label}</div>
      <div className="flex flex-col gap-2.5">
        {group.assignments.map((a, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-800">
              {workerName(workers, a.workerId)}
            </span>
            <span className="text-xs font-medium text-foreground">
              {a.isOff ? (
                '휴무'
              ) : (
                <>
                  {a.startTime} ~ {a.endTime}{' '}
                  <span className="text-muted-foreground">· {duration(a.startTime, a.endTime)}</span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="text-muted-foreground/70">특이사항 · </span>
        {group.note || '없음'}
      </div>
    </div>
  )
}

interface ScheduleSectionProps {
  securityCase: SecurityCase
  workers: Worker[]
  onAddGroup: (date: string) => void
  onEditGroup: (date: string, group: ScheduleGroup) => void
}

function ScheduleSection({ securityCase, workers, onAddGroup, onEditGroup }: ScheduleSectionProps) {
  const schedule = securityCase.workSchedule!
  const [expandedDate, setExpandedDate] = useState<string | null>(schedule.days[0]?.date ?? null)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const preMeetingMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      setPreMeeting(securityCase.id, { ...schedule.preMeeting, enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
    },
    onError: () => {
      showToast('사전미팅 설정 변경에 실패했습니다', 'error')
    },
  })

  function toggleExpanded(day: ScheduleDay) {
    setExpandedDate((prev) => (prev === day.date ? null : day.date))
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5.5">
      <div>
        <div className="text-sm font-bold text-foreground">근무 스케줄</div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          배치기간({securityCase.startDate} ~ {securityCase.endDate}) 내 일자별로 자동
          생성됩니다. 각 일자 섹션의 그룹 추가로 근무조를 나누고, 그룹 안에서 근무자별로 시간을
          개별 설정할 수 있습니다.
        </p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-sm font-bold text-foreground">사전미팅</div>
          <label className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">근무시간 외 별도 진행</span>
            <Switch
              checked={schedule.preMeeting.enabled}
              onCheckedChange={(checked) => preMeetingMutation.mutate(checked)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          근무일 근무시간 내에 사전미팅을 진행할 경우 토글을 꺼두면 되며 별도 시간 등록이
          필요하지 않습니다. 근무시간 외 진행 시 토글을 켜서 날짜·근무자·시작/종료시간을
          등록하세요.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {schedule.days.map((day) => {
          const expanded = expandedDate === day.date
          return (
            <div key={day.date} className="rounded-lg border border-border">
              {expanded ? (
                <div className="p-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(day)}
                      className="flex items-center gap-2 text-sm font-bold text-foreground"
                    >
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                      {formatDateWithWeekday(day.date)}
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddGroup(day.date)}
                      className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <Plus className="size-3.5" />
                      그룹 추가
                    </button>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {day.groups.map((group, i) => (
                      <div key={group.id} className="group/schedule relative">
                        <button
                          type="button"
                          onClick={() => onEditGroup(day.date, group)}
                          className="absolute top-3.5 right-3.5 text-[11px] font-semibold text-primary hover:underline"
                        >
                          수정
                        </button>
                        <GroupCard group={group} label={`그룹 ${i + 1}`} workers={workers} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(day)}
                    className="flex min-w-0 flex-1 items-center gap-2.5"
                  >
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="shrink-0 text-sm font-bold text-foreground">
                      {formatDateWithWeekday(day.date)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {day.groups.map((_, i) => `그룹 ${i + 1}`).join(' · ')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddGroup(day.date)}
                    className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Plus className="size-3.5" />
                    그룹 추가
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ScheduleSection
