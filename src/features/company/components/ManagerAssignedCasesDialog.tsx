import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import StatusBadge from '@/shared/components/StatusBadge'
import { formatManagementNumber } from '@/shared/lib/managementNumber'
import type { ManagerAccount } from '../api/managerAccounts'
import type { SecurityCase } from '../../police/types/securityCase'

interface ManagerAssignedCasesDialogProps {
  target: ManagerAccount | null
  cases: SecurityCase[]
  onOpenChange: (open: boolean) => void
}

// 관리자 계정 관리(Phase 3.6 항목2)의 "담당경호" — 담당자 변경(재배정)은
// 이 화면 책임이 아니라 경호 상세 화면 쪽에 있어야 한다는 판단으로(2026-08-31,
// roadmap.md 후속 항목 참고), 여기서는 대상 본부관리자에게 배정된 건을 조회
// 전용으로만 보여준다.
function ManagerAssignedCasesDialog({
  target,
  cases,
  onOpenChange,
}: ManagerAssignedCasesDialogProps) {
  // 종결/취소 건은 제외 — 목록 화면의 배정건수 카운트 기준과 동일.
  const assignedCases = target
    ? cases.filter(
        (c) => c.assigneeId === target.id && c.status !== '종결' && c.status !== '취소',
      )
    : []

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>담당경호</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {target.name} 본부관리자{target.branch ? ` · ${target.branch}` : ''}
              </p>
            </DialogHeader>

            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {assignedCases.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  배정된 경호건이 없습니다
                </p>
              )}
              {assignedCases.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2.5 rounded-lg border border-border px-3.5 py-3"
                >
                  <span className="text-sm font-medium text-foreground">
                    {formatManagementNumber(c.receiptNumber, c.securityCode)}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-1.5">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="px-6">
                닫기
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ManagerAssignedCasesDialog
