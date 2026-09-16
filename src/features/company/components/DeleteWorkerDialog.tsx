import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import LoadingOverlay from '@/shared/components/LoadingOverlay'
import { deleteWorker, type Worker } from '../api/workers'
import { useToastStore } from '../../../shared/hooks/useToastStore'

interface DeleteWorkerDialogProps {
  target: Worker | null
  onOpenChange: (open: boolean) => void
  // 근무자 상세 화면에서 쓸 때 삭제 후 목록으로 돌려보내는 용도(목록 화면은 그 자리에
  // 머물러야 해서 안 넘김).
  onSuccess?: () => void
}

// 근무자 삭제 — DELETE Guard/Stec/W/DeleteGuardInfo?guardSeq=. 사유 없이 확인만.
function DeleteWorkerDialog({ target, onOpenChange, onSuccess }: DeleteWorkerDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: () => deleteWorker(target!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] })
      showToast('근무자가 삭제되었습니다', 'success')
      onOpenChange(false)
      onSuccess?.()
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
      <LoadingOverlay show={mutation.isPending} variant="삭제" />
    </Dialog>
  )
}

export default DeleteWorkerDialog
