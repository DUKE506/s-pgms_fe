import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import LoadingOverlay from '@/shared/components/LoadingOverlay'
import { approvePeriodRequest } from '../api/requests'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../../police/types/securityCase'

interface PeriodRequestActionDialogProps {
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

// 연장요청/단축요청 승인 확인 다이얼로그. 거부는 운영팀 결정으로 화면에서 제외됐다
// (2026-09-11) — 승인 경로만 남는다.
function PeriodRequestActionDialog({ targetCase, onOpenChange }: PeriodRequestActionDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)
  const request = targetCase?.pendingPeriodRequest

  const mutation = useMutation({
    mutationFn: () => approvePeriodRequest(targetCase!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-cases-all'] })
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] })
      queryClient.invalidateQueries({ queryKey: ['period-requests'] })
      showToast('요청을 승인했습니다', 'success')
      onOpenChange(false)
    },
    onError: () => {
      showToast('승인에 실패했습니다', 'error')
    },
  })

  return (
    <Dialog open={targetCase != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        {targetCase && request && (
          <>
            <DialogHeader>
              <DialogTitle>요청 승인</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {targetCase.receiptNumber} · {targetCase.policeStation}
              </p>
            </DialogHeader>

            <p className="text-sm text-foreground">{request.type} 요청을 승인하시겠습니까?</p>

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
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="px-5"
              >
                승인
              </Button>
            </div>
          </>
        )}
      </DialogContent>
      <LoadingOverlay show={mutation.isPending} variant="승인" />
    </Dialog>
  )
}

export default PeriodRequestActionDialog
