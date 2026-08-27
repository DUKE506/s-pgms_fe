import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { cancelAssignedCase } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { SecurityCase } from '../types/securityCase'

interface CancelAssignedCaseDialogProps {
  securityCase: SecurityCase
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 경호취소: 경호코드 발급 이후라 사유 입력이 필수고 상태값 '취소'로 남는다
// (project-overview.md 취소 규칙). 취소된 건은 경호목록에서 제외되므로 목록으로 이동.
function CancelAssignedCaseDialog({ securityCase, open, onOpenChange }: CancelAssignedCaseDialogProps) {
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)
  const navigate = useNavigate()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: () => cancelAssignedCase(securityCase.id, reason.trim()),
    onSuccess: () => {
      showToast('경호가 취소되었습니다', 'success')
      navigate('/security-cases')
    },
    onError: () => showToast('경호취소에 실패했습니다', 'error'),
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason('')
      setShowError(false)
    }
    onOpenChange(next)
  }

  function handleSubmit() {
    if (reason.trim() === '') {
      setShowError(true)
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>경호취소</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {formatManagementNumber(securityCase.receiptNumber, securityCase.securityCode)}
          </p>
        </DialogHeader>

        <p className="text-sm text-foreground">
          경호를 취소하면 상태가 &apos;취소&apos;로 변경되고 이력에 남습니다.
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="police-cancel-reason">취소 사유</Label>
          <Textarea
            id="police-cancel-reason"
            placeholder="취소 사유를 입력하세요"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (showError) setShowError(false)
            }}
            aria-invalid={showError}
          />
          {showError && <p className="text-[11px] text-destructive">취소 사유를 입력해주세요</p>}
        </div>

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} className="px-5">
            닫기
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={handleSubmit}
            className="px-5"
          >
            경호취소
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CancelAssignedCaseDialog
