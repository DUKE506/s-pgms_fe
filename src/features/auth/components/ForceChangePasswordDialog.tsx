import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ForceChangePasswordDialogProps {
  open: boolean
  id: string
  onSubmit: (newPassword: string) => Promise<void>
}

// 최초 로그인 강제 비밀번호 변경(게스트 발급/관리자 비밀번호 초기화 직후,
// mustChangePassword 플래그 기반) — 닫기 버튼도 없고 바깥 클릭/ESC로도 못
// 닫는다, 변경을 완료해야만 다음으로 진행 가능(2026-08-31 결정). 변경
// 성공 후에는 세션을 발급하지 않고 로그인 폼으로 돌아가 재로그인을
// 요구한다 — 호출부(로그인 페이지)가 처리.
function ForceChangePasswordDialog({ open, id, onSubmit }: ForceChangePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function reset() {
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setIsPending(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (newPassword.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다')
      return
    }
    if (newPassword.toLowerCase() === id.toLowerCase()) {
      setError('아이디와 다른 비밀번호로 설정해주세요')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }

    setIsPending(true)
    try {
      await onSubmit(newPassword)
      reset()
    } catch {
      setError('비밀번호 변경에 실패했습니다')
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[380px]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
          <p className="text-xs text-muted-foreground">
            최초 로그인이거나 비밀번호가 초기화된 계정입니다. 새 비밀번호를 설정해주세요.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="force-new-password">새 비밀번호</Label>
            <Input
              id="force-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="force-confirm-password">새 비밀번호 확인</Label>
            <Input
              id="force-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="mt-1.5">
            변경하고 다시 로그인
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ForceChangePasswordDialog
