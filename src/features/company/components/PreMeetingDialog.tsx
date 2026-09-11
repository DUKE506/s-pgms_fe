import { useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import DateField from '@/shared/components/DateField'
import { cn } from '@/lib/utils'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { setPreMeeting } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import HourMinuteSelect from './HourMinuteSelect'
import type { Worker } from '../api/workers'
import type { PreMeeting, SecurityCase } from '../../police/types/securityCase'

interface PreMeetingDialogProps {
  securityCase: SecurityCase
  workers: Worker[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 사전미팅은 근무자별이 아니라 미팅 전체 1구간 + 참석 근무자 목록이다 — 백엔드
// API(SaveCaseMeeting)가 애초에 이 형태로만 받는다는 걸 반영해 UI도 맞췄다
// (2026-09-11 운영팀 결정, 이전엔 UI만 근무자별 시간이었고 저장 시 뭉쳐 보내고
// 있었음 — issues #11 해소). 상단에서 미팅 날짜·시간을 정하고, 참석자는 체크로
// 선택만 한다(AssignManagerDialog의 토글 리스트 패턴 재사용).
function PreMeetingDialog({ securityCase, workers, open, onOpenChange }: PreMeetingDialogProps) {
  const existing = securityCase.workSchedule?.preMeeting ?? null

  // 참석 근무자 후보는 전체 근무자가 아니라 경호계획서 정보에 등록된(경호풀) 근무자만
  // (2026-09-11 사용자 지적 — 그룹 근무자 배정과 같은 범위여야 함).
  const registeredWorkerIds = new Set(
    (securityCase.baseInfo?.defaultWorkers ?? []).map((w) => w.workerId),
  )
  const eligibleWorkers = workers.filter((w) => registeredWorkerIds.has(w.id))

  const [date, setDate] = useState(existing?.date ?? securityCase.startDate)
  const [startTime, setStartTime] = useState(existing?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(existing?.endTime ?? '10:00')
  const [workerIds, setWorkerIds] = useState<string[]>(existing?.workerIds ?? [])
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  function resetAndClose() {
    onOpenChange(false)
  }

  function toggleWorker(id: string) {
    setWorkerIds((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]))
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: PreMeeting = { date, startTime, endTime, workerIds }
      return setPreMeeting(securityCase.id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
      showToast('사전미팅이 저장되었습니다', 'success')
      resetAndClose()
    },
    onError: () => {
      showToast('사전미팅 저장에 실패했습니다', 'error')
    },
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>사전미팅 {existing ? '수정' : '추가'}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pre-meeting-date">날짜</Label>
          <DateField id="pre-meeting-date" value={date} onChange={setDate} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>사전미팅 시간</Label>
          <div className="flex flex-wrap items-center gap-2">
            <HourMinuteSelect
              value={startTime}
              onChange={setStartTime}
              ariaLabel="사전미팅 시작시간"
            />
            <span className="text-sm text-muted-foreground">~</span>
            <HourMinuteSelect value={endTime} onChange={setEndTime} ariaLabel="사전미팅 종료시간" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>참석 근무자</Label>
          <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
            {eligibleWorkers.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                경호계획서 정보에 등록된 근무자가 없습니다
              </p>
            )}
            {eligibleWorkers.map((worker) => {
              const selected = workerIds.includes(worker.id)
              return (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => toggleWorker(worker.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors',
                    selected ? 'border-blue-200 bg-blue-50' : 'border-border hover:bg-muted',
                  )}
                >
                  {selected ? (
                    <CheckCircle2 className="size-5 shrink-0 text-blue-600" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className={cn('font-medium text-foreground', !selected && 'font-normal')}>
                    {worker.name} ({worker.employeeId})
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={resetAndClose} className="px-5">
            취소
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="px-5"
          >
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PreMeetingDialog
