import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteGuestAccount, type GuestAccount } from '../api/guests'
import { useToastStore } from '../../../shared/hooks/useToastStore'

interface DeleteGuestAccountDialogProps {
  targetGuest: GuestAccount | null
  onOpenChange: (open: boolean) => void
}

function DeleteGuestAccountDialog({ targetGuest, onOpenChange }: DeleteGuestAccountDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)

  const mutation = useMutation({
    mutationFn: () => deleteGuestAccount(targetGuest!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      showToast('게스트 계정이 삭제되었습니다', 'success')
      onOpenChange(false)
    },
    onError: () => showToast('게스트 계정 삭제에 실패했습니다', 'error'),
  })

  return (
    <Dialog open={targetGuest != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        {targetGuest && (
          <>
            <DialogHeader>
              <DialogTitle>게스트 계정 삭제</DialogTitle>
              <p className="text-xs text-muted-foreground">{targetGuest.name}</p>
            </DialogHeader>

            <p className="text-sm text-foreground">
              이 게스트 계정을 삭제하시겠습니까? 삭제하면 해당 아이디로 더 이상 로그인할 수
              없습니다.
            </p>

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
    </Dialog>
  )
}

export default DeleteGuestAccountDialog
