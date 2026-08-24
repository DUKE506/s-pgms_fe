import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { createSchedule } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import HourMinuteSelect from './HourMinuteSelect'
import type { SecurityCase } from '../../police/types/securityCase'

interface ScheduleInitDialogProps {
  securityCase: SecurityCase
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ScheduleInitDialog({ securityCase, open, onOpenChange }: ScheduleInitDialogProps) {
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: () =>
      createSchedule(securityCase.id, {
        startDate: securityCase.startDate,
        endDate: securityCase.endDate,
        startTime,
        endTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
      showToast('근무 스케줄이 생성되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => {
      showToast('근무 스케줄 생성에 실패했습니다', 'error')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>스케줄 정보 입력</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label>배치기간</Label>
          <div className="flex items-center gap-2">
            <Input value={securityCase.startDate} disabled />
            <span className="text-sm text-muted-foreground">~</span>
            <Input value={securityCase.endDate} disabled />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>근무시간</Label>
          <div className="flex flex-wrap items-center gap-2">
            <HourMinuteSelect value={startTime} onChange={setStartTime} ariaLabel="시작시간" />
            <span className="text-sm text-muted-foreground">~</span>
            <HourMinuteSelect value={endTime} onChange={setEndTime} ariaLabel="종료시간" />
          </div>
        </div>

        <p className="rounded-lg bg-blue-50 p-3.5 text-xs leading-relaxed text-blue-700">
          저장하면 배치기간 내 일자별로 섹션이 자동 생성되고, 각 일자에 그룹 1이 만들어져 기본
          근무자가 입력한 시간으로 배정됩니다. 이후 각 일자에서 그룹 추가로 근무조를 나누거나,
          그룹 안 근무자별로 개별 시간을 조정할 수 있습니다.
        </p>

        <div className="flex justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="px-5"
          >
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

export default ScheduleInitDialog
