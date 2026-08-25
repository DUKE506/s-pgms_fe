import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { closeCase } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../types/securityCase'

interface CloseCaseDialogProps {
  securityCase: SecurityCase
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 종결: 경호완료 → 종결 최종 전환(project-overview.md 업무 워크플로우 6단계).
// 파기확인서 업로드 전엔 버튼 자체가 비활성이라 여기까지 왔다면 조건은 이미 충족됨.
function CloseCaseDialog({ securityCase, open, onOpenChange }: CloseCaseDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: () => closeCase(securityCase.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
      showToast('종결 처리되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => showToast('종결 처리에 실패했습니다', 'error'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>종결</DialogTitle>
          <p className="text-sm font-semibold text-muted-foreground">
            {formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)}
          </p>
        </DialogHeader>

        <p className="text-sm text-foreground">
          경호를 종결 처리하시겠습니까? 종결 이후에는 상태를 되돌릴 수 없습니다.
        </p>

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="px-5">
            닫기
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="px-5"
          >
            종결
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CloseCaseDialog
