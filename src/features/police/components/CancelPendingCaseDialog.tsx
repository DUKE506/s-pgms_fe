import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cancelPendingCase } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../types/securityCase'

interface CancelPendingCaseDialogProps {
  securityCase: SecurityCase
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 접수취소: 사유 없이 확인만 받고 DB에서 완전히 삭제한다(project-overview.md
// 취소 규칙). 삭제 후엔 이 상세 페이지 자체가 무의미해지므로 목록으로 이동.
function CancelPendingCaseDialog({ securityCase, open, onOpenChange }: CancelPendingCaseDialogProps) {
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: () => cancelPendingCase(securityCase.id),
    onSuccess: () => {
      showToast('접수가 취소되었습니다', 'success')
      navigate('/security-cases')
    },
    onError: () => showToast('접수취소에 실패했습니다', 'error'),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>경호 취소</DialogTitle>
          <p className="text-xs text-muted-foreground">{securityCase.receiptNumber}</p>
        </DialogHeader>

        <p className="text-sm text-foreground">
          이 접수를 취소하시겠습니까? 취소하면 접수 내용이 삭제되며 복구할 수 없습니다.
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
            경호 취소
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CancelPendingCaseDialog
