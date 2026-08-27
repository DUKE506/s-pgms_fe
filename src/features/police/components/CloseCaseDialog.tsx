import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import { closeCase } from '../api/securityCaseDetail'
import { useToastStore } from '../../../shared/hooks/useToastStore'
import type { ClosureReason, SecurityCase } from '../types/securityCase'

interface CloseCaseDialogProps {
  securityCase: SecurityCase
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 종결 사유 목록: 경찰 쪽에서 아직 확정 목록을 안 줘서 통상적으로 쓰이는 항목으로
// 임시 구성(2026-08-27). 추후 실제 목록으로 교체될 수 있음(ClosureReason 참고).
const CLOSURE_REASONS: ClosureReason[] = [
  '경호기간 만료',
  '피해자 요청에 의한 종결',
  '피의자 구속',
  '피해자 소재불명·연락두절',
  '기타',
]

// 종결: 경호완료 → 종결 최종 전환(project-overview.md 업무 워크플로우 6단계).
// 파기확인서 업로드 전엔 버튼 자체가 비활성이라 여기까지 왔다면 조건은 이미 충족됨.
function CloseCaseDialog({ securityCase, open, onOpenChange }: CloseCaseDialogProps) {
  const [reason, setReason] = useState<ClosureReason | ''>('')
  const [detail, setDetail] = useState('')
  const [showError, setShowError] = useState(false)
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.show)

  const mutation = useMutation({
    mutationFn: () => closeCase(securityCase.id, reason as ClosureReason, detail.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-case', securityCase.id] })
      showToast('종결 처리되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => showToast('종결 처리에 실패했습니다', 'error'),
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason('')
      setDetail('')
      setShowError(false)
    }
    onOpenChange(next)
  }

  function handleSubmit() {
    if (reason === '' || (reason === '기타' && detail.trim() === '')) {
      setShowError(true)
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="closure-reason">종결 사유</Label>
          <Select
            value={reason}
            onValueChange={(value) => {
              setReason(value as ClosureReason)
              if (showError) setShowError(false)
            }}
          >
            <SelectTrigger id="closure-reason" aria-invalid={showError && reason === ''}>
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              {CLOSURE_REASONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showError && reason === '' && (
            <p className="text-[11px] text-destructive">종결 사유를 선택해주세요</p>
          )}
        </div>

        {reason === '기타' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="closure-reason-detail">상세 사유</Label>
            <Textarea
              id="closure-reason-detail"
              placeholder="종결 사유를 입력하세요"
              value={detail}
              onChange={(e) => {
                setDetail(e.target.value)
                if (showError) setShowError(false)
              }}
              aria-invalid={showError && detail.trim() === ''}
            />
            {showError && detail.trim() === '' && (
              <p className="text-[11px] text-destructive">상세 사유를 입력해주세요</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} className="px-5">
            닫기
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={handleSubmit}
            className="bg-destructive px-5 text-white hover:bg-destructive/90"
          >
            종결
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CloseCaseDialog
