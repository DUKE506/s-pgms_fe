import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { resetManagerAccountPassword, type ManagerAccount } from '../api/managerAccounts'
import { useToastStore } from '../../../shared/hooks/useToastStore'

interface ResetManagerPasswordDialogProps {
  target: ManagerAccount | null
  onOpenChange: (open: boolean) => void
}

function ResetManagerPasswordDialog({ target, onOpenChange }: ResetManagerPasswordDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)

  const mutation = useMutation({
    mutationFn: () => resetManagerAccountPassword(target!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-accounts'] })
      showToast('비밀번호가 초기화되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => showToast('비밀번호 초기화에 실패했습니다', 'error'),
  })

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>비밀번호 초기화</DialogTitle>
            </DialogHeader>

            <div className="rounded-lg bg-muted/60 p-3.5">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">아이디</p>
              <p className="text-sm font-bold text-foreground">{target.id}</p>
            </div>

            <p className="text-sm text-foreground">비밀번호를 초기화하시겠습니까?</p>

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
                초기화
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ResetManagerPasswordDialog
