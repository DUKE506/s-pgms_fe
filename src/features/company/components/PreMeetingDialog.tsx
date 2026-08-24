import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { setPreMeeting } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import HourMinuteSelect from './HourMinuteSelect'
import type { Worker } from '../api/workers'
import type { PreMeeting, PreMeetingAssignment, SecurityCase } from '../../police/types/securityCase'

interface PreMeetingDialogProps {
  securityCase: SecurityCase
  workers: Worker[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 근무 스케줄과 달리 그룹 개념이 없어 근무자 행을 플랫하게 추가/삭제한다
// (2026-08-24 결정). 등록 여부는 별도 플래그가 아니라 레코드 존재 자체로
// 표현하므로, 이 모달은 순수하게 날짜+근무자별 시간을 CRUD하는 역할만 한다.
function PreMeetingDialog({ securityCase, workers, open, onOpenChange }: PreMeetingDialogProps) {
  const existing = securityCase.workSchedule?.preMeeting ?? null

  const [date, setDate] = useState(existing?.date ?? securityCase.startDate)
  const [assignments, setAssignments] = useState<PreMeetingAssignment[]>(
    existing?.assignments ?? [{ workerId: workers[0]?.id ?? '', startTime: '09:00', endTime: '10:00' }],
  )
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  function resetAndClose() {
    onOpenChange(false)
  }

  function updateAssignment(index: number, patch: Partial<PreMeetingAssignment>) {
    setAssignments((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)))
  }

  function addAssignment() {
    const picked = new Set(assignments.map((a) => a.workerId))
    const next = workers.find((w) => !picked.has(w.id))
    if (!next) {
      showToast('추가할 수 있는 근무자가 없습니다', 'error')
      return
    }
    setAssignments((prev) => [...prev, { workerId: next.id, startTime: '09:00', endTime: '10:00' }])
  }

  function removeAssignment(index: number) {
    setAssignments((prev) => prev.filter((_, i) => i !== index))
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: PreMeeting = { date, assignments }
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
          <Input
            id="pre-meeting-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3.5">
          {assignments.map((assignment, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">근무자 {index + 1}</span>
                {assignments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAssignment(index)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`근무자 ${index + 1} 삭제`}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <Select
                value={assignment.workerId}
                onValueChange={(value) => updateAssignment(index, { workerId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2">
                <HourMinuteSelect
                  value={assignment.startTime}
                  onChange={(v) => updateAssignment(index, { startTime: v })}
                  ariaLabel={`근무자 ${index + 1} 시작시간`}
                />
                <span className="text-sm text-muted-foreground">~</span>
                <HourMinuteSelect
                  value={assignment.endTime}
                  onChange={(v) => updateAssignment(index, { endTime: v })}
                  ariaLabel={`근무자 ${index + 1} 종료시간`}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addAssignment}
            className="flex w-fit items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="size-3.5" />
            근무자 추가
          </button>
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
