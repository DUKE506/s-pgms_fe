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
import { Switch } from '@/components/ui/switch'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import HourMinuteSelect from './HourMinuteSelect'
import { upsertScheduleGroup } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { Worker } from '../api/workers'
import type { ScheduleAssignment, ScheduleGroup, SecurityCase } from '../../police/types/securityCase'

function defaultTimes(workHours: string): { start: string; end: string } {
  const [start, end] = workHours.split('~').map((v) => v.trim())
  return { start: start || '09:00', end: end || '18:00' }
}

interface ScheduleGroupDialogProps {
  securityCase: SecurityCase
  workers: Worker[]
  date: string | null
  group: ScheduleGroup | null
  onOpenChange: (open: boolean) => void
}

function ScheduleGroupDialog({
  securityCase,
  workers,
  date,
  group,
  onOpenChange,
}: ScheduleGroupDialogProps) {
  const open = date != null
  const { start, end } = defaultTimes(securityCase.baseInfo?.workHours ?? '09:00 ~ 18:00')
  const groupLabel = (() => {
    if (!group || !date) return null
    const day = securityCase.workSchedule?.days.find((d) => d.date === date)
    const index = day?.groups.findIndex((g) => g.id === group.id) ?? -1
    return index >= 0 ? `그룹 ${index + 1}` : null
  })()

  const [note, setNote] = useState(group?.note ?? '')
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>(
    group?.assignments ?? [
      { workerId: workers[0]?.id ?? '', startTime: start, endTime: end, isOff: false },
    ],
  )
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  function resetAndClose() {
    onOpenChange(false)
  }

  function updateAssignment(index: number, patch: Partial<ScheduleAssignment>) {
    setAssignments((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)))
  }

  function addAssignment() {
    const picked = new Set(assignments.map((a) => a.workerId))
    const next = workers.find((w) => !picked.has(w.id))
    if (!next) {
      showToast('추가할 수 있는 근무자가 없습니다', 'error')
      return
    }
    setAssignments((prev) => [...prev, { workerId: next.id, startTime: start, endTime: end, isOff: false }])
  }

  function removeAssignment(index: number) {
    setAssignments((prev) => prev.filter((_, i) => i !== index))
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: ScheduleGroup = {
        id: group?.id ?? `${securityCase.id}-${date}-group-${Date.now()}`,
        note,
        assignments,
      }
      return upsertScheduleGroup(securityCase.id, date!, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
      showToast('근무 그룹이 저장되었습니다', 'success')
      resetAndClose()
    },
    onError: () => {
      showToast('근무 그룹 저장에 실패했습니다', 'error')
    },
  })

  return (
    <Dialog open={open} onOpenChange={(next) => !next && resetAndClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>그룹 추가/수정</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)} · {date}
            {groupLabel ? ` · ${groupLabel}` : ''}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="group-note">이 그룹의 특이사항</Label>
          <Input id="group-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="flex flex-col gap-3.5">
          {assignments.map((assignment, index) => (
            <div key={index} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">근무자 {index + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">휴무</span>
                    <Switch
                      checked={assignment.isOff}
                      onCheckedChange={(checked) => updateAssignment(index, { isOff: checked })}
                    />
                  </label>
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
                  disabled={assignment.isOff}
                  onChange={(v) => updateAssignment(index, { startTime: v })}
                  ariaLabel={`근무자 ${index + 1} 시작시간`}
                />
                <span className="text-sm text-muted-foreground">~</span>
                <HourMinuteSelect
                  value={assignment.endTime}
                  disabled={assignment.isOff}
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
            근무자 추가 (이 그룹에)
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

export default ScheduleGroupDialog
