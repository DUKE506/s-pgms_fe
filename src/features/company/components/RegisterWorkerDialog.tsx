import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerWorker, type WorkerCreateInput } from '../api/workers'
import { useToastStore } from '../../../shared/hooks/useToastStore'

const INITIAL_FORM: WorkerCreateInput = { name: '', employeeId: '', department: '', phone: '' }

interface RegisterWorkerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function RegisterWorkerDialog({ open, onOpenChange }: RegisterWorkerDialogProps) {
  const [form, setForm] = useState<WorkerCreateInput>(INITIAL_FORM)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: () => registerWorker(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      showToast('근무자가 등록되었습니다', 'success')
      handleOpenChange(false)
    },
    onError: () => {
      showToast('근무자 등록에 실패했습니다', 'error')
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setForm(INITIAL_FORM)
    onOpenChange(nextOpen)
  }

  function update<K extends keyof WorkerCreateInput>(key: K, value: WorkerCreateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isValid = Object.values(form).every((v) => v.trim() !== '')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>근무자 등록</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="worker-name">이름</Label>
            <Input
              id="worker-name"
              placeholder="이름 입력"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="worker-employee-id">사번</Label>
            <Input
              id="worker-employee-id"
              placeholder="사번 입력"
              value={form.employeeId}
              onChange={(e) => update('employeeId', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="worker-department">부서</Label>
            <Input
              id="worker-department"
              placeholder="부서 입력"
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="worker-phone">휴대전화번호</Label>
            <Input
              id="worker-phone"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-1.5 xl:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            className="flex-1 px-6 xl:flex-none"
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={!isValid || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="flex-1 px-6 xl:flex-none"
          >
            등록
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RegisterWorkerDialog
