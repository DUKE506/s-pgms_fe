import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteWorker, type Worker } from '../api/workers'
import { useToastStore } from '../../../shared/hooks/useToastStore'

interface DeleteWorkerDialogProps {
  target: Worker | null
  onOpenChange: (open: boolean) => void
}

// 근무자 삭제 — DELETE Guard/Stec/W/DeleteGuardInfo?guardSeq=. 사유 없이 확인만.
function DeleteWorkerDialog({ target, onOpenChange }: DeleteWorkerDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: () => deleteWorker(target!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      showToast('근무자가 삭제되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => {
      showToast('근무자 삭제에 실패했습니다', 'error')
    },
  })

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>근무자 삭제</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {target.name} · {target.employeeId}
              </p>
            </DialogHeader>

            <p className="text-sm text-foreground">
              이 근무자를 삭제하시겠습니까? 삭제하면 복구할 수 없습니다.
            </p>

            <div className="flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                className="px-5"
              >
                닫기
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="px-5"
              >
                삭제
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DeleteWorkerDialog
