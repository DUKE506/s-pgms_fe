import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { approvePeriodRequest, rejectPeriodRequest } from '../api/requests'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../../police/types/securityCase'

interface PeriodRequestActionDialogProps {
  action: 'approve' | 'reject'
  targetCase: SecurityCase | null
  onOpenChange: (open: boolean) => void
}

function formatDate(dateLike: string) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

// 연장요청/단축요청 승인·거부 공용 확인 다이얼로그. 거부 사유는 데이터 모델/
// 요구사항에 없어 별도 입력 없이 단순 확인만 받는다(2026-08-27 결정).
function PeriodRequestActionDialog({
  action,
  targetCase,
  onOpenChange,
}: PeriodRequestActionDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const request = targetCase?.pendingPeriodRequest

  const mutation = useMutation({
    mutationFn: () =>
      action === 'approve'
        ? approvePeriodRequest(targetCase!.id)
        : rejectPeriodRequest(targetCase!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-cases-all'] })
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
      queryClient.invalidateQueries({ queryKey: ['period-requests'] })
      showToast(action === 'approve' ? '요청을 승인했습니다' : '요청을 거부했습니다', 'success')
      onOpenChange(false)
    },
    onError: () => {
      showToast(action === 'approve' ? '승인에 실패했습니다' : '거부에 실패했습니다', 'error')
    },
  })

  const title = action === 'approve' ? '요청 승인' : '요청 거부'
  const confirmLabel = action === 'approve' ? '승인' : '거부'

  return (
    <Dialog open={targetCase != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        {targetCase && request && (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {targetCase.receiptNumber} · {targetCase.policeStation}
              </p>
            </DialogHeader>

            <p className="text-sm text-foreground">
              {request.type} 요청을 {confirmLabel}하시겠습니까?
            </p>

            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">현재 배치기간</span>
                <span className="text-foreground">
                  {formatDate(targetCase.startDate)} ~ {formatDate(targetCase.endDate)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">요청 배치기간</span>
                <span className="font-semibold text-foreground">
                  {formatDate(targetCase.startDate)} ~ {formatDate(request.requestedEndDate)}
                </span>
              </div>
            </div>

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
                variant={action === 'reject' ? 'destructive' : 'default'}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="px-5"
              >
                {confirmLabel}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default PeriodRequestActionDialog
