import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateManagerAccountInfo, type ManagerAccount } from '../api/managerAccounts'
import { useToastStore } from '../../../shared/hooks/useToastStore'

interface EditManagerAccountDialogProps {
  target: ManagerAccount | null
  onOpenChange: (open: boolean) => void
}

function EditManagerAccountForm({
  target,
  onOpenChange,
}: {
  target: ManagerAccount
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(target.name)
  const [phone, setPhone] = useState(target.phone ?? '')
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)

  const mutation = useMutation({
    mutationFn: () => updateManagerAccountInfo(target.id, { name: name.trim(), phone: phone.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-accounts'] })
      showToast('계정 정보가 수정되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => showToast('정보수정에 실패했습니다', 'error'),
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>계정 정보수정</DialogTitle>
        <p className="text-xs text-muted-foreground">
          {target.id} · {target.role}
        </p>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor="manager-name">이름</Label>
        <Input id="manager-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="manager-phone">연락처</Label>
        <Input
          id="manager-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
        />
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
          disabled={!name.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="flex-1 px-6 xl:flex-none"
        >
          저장
        </Button>
      </div>
    </>
  )
}

function EditManagerAccountDialog({ target, onOpenChange }: EditManagerAccountDialogProps) {
  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        {target && <EditManagerAccountForm target={target} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}

export default EditManagerAccountDialog
