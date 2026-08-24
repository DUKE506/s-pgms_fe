import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cancelPendingRequest } from '../api/requests'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../../police/types/securityCase'

interface CancelPendingCaseDialogProps {
  targetCase: SecurityCase | null
  onOpenChange: (open: boolean) => void
}

// 접수취소: 아직 경호코드가 발급되지 않은 상태라 사유 없이 확인만 받고 DB에서
// 완전히 삭제한다 (project-overview.md 취소 규칙).
function CancelPendingCaseDialog({ targetCase, onOpenChange }: CancelPendingCaseDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: () => cancelPendingRequest(targetCase!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
      showToast('배치요청이 취소되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => {
      showToast('배치요청 취소에 실패했습니다', 'error')
    },
  })

  return (
    <Dialog open={targetCase != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        {targetCase && (
          <>
            <DialogHeader>
              <DialogTitle>접수취소</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {targetCase.receiptNumber} · {targetCase.policeStation}
              </p>
            </DialogHeader>

            <p className="text-sm text-foreground">
              이 배치요청을 취소하시겠습니까? 취소하면 접수 내용이 삭제되며 복구할 수 없습니다.
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
                접수취소
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CancelPendingCaseDialog
