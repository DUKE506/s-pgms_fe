import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { changeInitialPassword, login } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { getDefaultRouteForRole } from '../lib/defaultRoute'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import ForceChangePasswordDialog from '../components/ForceChangePasswordDialog'
import { useToastStore } from '@/shared/hooks/useToastStore'

function PoliceLoginPage() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [forceChangeTargetId, setForceChangeTargetId] = useState<string | null>(null)
  const setSession = useAuthStore((state) => state.setSession)
  const showToast = useToastStore((state) => state.show)
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const result = await login(id, password)
      if ('mustChangePassword' in result) {
        setForceChangeTargetId(result.id)
        return
      }
      setSession(result)
      navigate(getDefaultRouteForRole(result.user.role))
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다')
    }
  }

  async function handleForceChangePassword(newPassword: string) {
    if (!forceChangeTargetId) return
    await changeInitialPassword(forceChangeTargetId, newPassword)
    setForceChangeTargetId(null)
    setPassword('')
    showToast('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요', 'success')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="font-heading text-xl leading-snug font-medium">경찰 로그인</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="police-id">아이디</Label>
              <Input
                id="police-id"
                placeholder="아이디를 입력하세요"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="police-password">비밀번호</Label>
              <Input
                id="police-password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-1.5">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>

      <ForceChangePasswordDialog
        open={forceChangeTargetId != null}
        id={forceChangeTargetId ?? ''}
        onSubmit={handleForceChangePassword}
      />
    </main>
  )
}

export default PoliceLoginPage
