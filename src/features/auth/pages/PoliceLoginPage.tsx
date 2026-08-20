import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { policeLogin } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { getDefaultRouteForRole } from '../lib/defaultRoute'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function PoliceLoginPage() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const setSession = useAuthStore((state) => state.setSession)
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const session = await policeLogin(id, password)
      setSession(session)
      navigate(getDefaultRouteForRole(session.user.role))
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다')
    }
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
              <Input id="police-id" value={id} onChange={(e) => setId(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="police-password">비밀번호</Label>
              <Input
                id="police-password"
                type="password"
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
    </main>
  )
}

export default PoliceLoginPage
