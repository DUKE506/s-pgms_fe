import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateWorker, type Worker } from '../api/workers'
import { useToastStore } from '../../../shared/hooks/useToastStore'

interface EditWorkerDialogProps {
  target: Worker | null
  onOpenChange: (open: boolean) => void
}

// 근무자 정보수정 — PATCH Guard/Stec/W/PatchGuardInfo.
// 사번(sabun)은 스키마에 없어 수정 불가 → 읽기 전용으로 노출.
// 부서는 GetGuardList가 `deptNm`으로 돌려줘(2026-09-10, findings #8 해소) 현재 값을 prefill한다.
function EditWorkerForm({
  target,
  onOpenChange,
}: {
  target: Worker
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const [name, setName] = useState(target.name)
  const [phone, setPhone] = useState(target.phone)
  const [department, setDepartment] = useState(target.department)

  const mutation = useMutation({
    mutationFn: () =>
      updateWorker({
        id: target.id,
        name: name.trim(),
        phone: phone.trim(),
        department: department.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      showToast('근무자 정보가 수정되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => {
      showToast('근무자 정보 수정에 실패했습니다', 'error')
    },
  })

  const isValid = name.trim() !== '' && phone.trim() !== ''

  return (
    <>
      <DialogHeader>
        <DialogTitle>근무자 정보수정</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-worker-employee-id">사번</Label>
          <Input id="edit-worker-employee-id" value={target.employeeId} readOnly disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-worker-name">이름</Label>
          <Input
            id="edit-worker-name"
            placeholder="이름 입력"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-worker-department">부서</Label>
          <Input
            id="edit-worker-department"
            placeholder="변경 시에만 입력 (현재 값은 조회되지 않음)"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-worker-phone">휴대전화번호</Label>
          <Input
            id="edit-worker-phone"
            placeholder="010-0000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2.5 pt-1.5 xl:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onOpenChange(false)}
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
          저장
        </Button>
      </div>
    </>
  )
}

function EditWorkerDialog({ target, onOpenChange }: EditWorkerDialogProps) {
  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        {target && <EditWorkerForm target={target} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}

export default EditWorkerDialog
