import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import LoadingOverlay from '@/shared/components/LoadingOverlay'
import { resetPoliceAccountPassword } from '../api/accountManagement'
import { useToastStore } from '../../../shared/hooks/useToastStore'

// target은 PoliceAccountRow 전체가 아니라 초기화에 필요한 최소 필드만 받는다 —
// 게스트 행(GuestAccount)·"내 계정"(로그인 세션)처럼 다른 타입에서도 그대로
// 재사용하기 위함(2026-09-17, #②).
interface ResetPasswordTarget {
  loginId: string
  userSeq: number
}

interface ResetPoliceAccountPasswordDialogProps {
  target: ResetPasswordTarget | null
  onOpenChange: (open: boolean) => void
  // 초기화 후 다시 불러올 쿼리키 — 화면마다(본청/지역청 목록, 경찰서 계정관리,
  // 본사 관리자 탭) 쓰는 쿼리키가 달라 호출부에서 넘겨받는다.
  invalidateQueryKey: unknown[]
}

function ResetPoliceAccountPasswordDialog({
  target,
  onOpenChange,
  invalidateQueryKey,
}: ResetPoliceAccountPasswordDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)

  const mutation = useMutation({
    mutationFn: () => resetPoliceAccountPassword(target!.userSeq),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey })
      showToast('비밀번호가 초기화되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => showToast('비밀번호 초기화에 실패했습니다', 'error'),
  })

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>비밀번호 초기화</DialogTitle>
            </DialogHeader>

            <div className="rounded-lg bg-muted/60 p-3.5">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">아이디</p>
              <p className="text-sm font-bold text-foreground">{target.loginId}</p>
            </div>

            <p className="text-sm text-foreground">비밀번호를 초기화하시겠습니까?</p>

            <div className="flex justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                className="px-5"
              >
                취소
              </Button>
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                className="px-5"
              >
                초기화
              </Button>
            </div>
          </>
        )}
      </DialogContent>
      <LoadingOverlay show={mutation.isPending} variant="초기화" />
    </Dialog>
  )
}

export default ResetPoliceAccountPasswordDialog
