import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import { changeInitialPassword, login } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { getDefaultRouteForRole } from '../lib/defaultRoute'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import ForceChangePasswordDialog from '../components/ForceChangePasswordDialog'
import { useToastStore } from '@/shared/hooks/useToastStore'

// 경찰/본사 로그인 화면 통합(2026-09-11 사용자 결정) — 실백엔드가 애초에 로그인을
// 하나로 취급해서(`Login` 응답 `code=100+codeSeq`로 역할까지 구분, roadmap Phase 5
// 백로그 "로그인 화면 통합 검토" 참고) 화면을 굳이 나눌 이유가 없었음. 로그인 성공
// 후 이동은 기존과 동일하게 `getDefaultRouteForRole(role)`이 담당 — 이 화면 자체는
// 역할을 몰라도 된다.
function LoginPage() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    // xl 미만(모바일): 로그인-모바일 목업처럼 카드 박스 없이 페이지 배경 위에 내용이
    // 바로 놓이고, 카피라이트는 화면 하단에 고정(justify-between). xl 이상(웹
    // 목업): 중앙 카드 + 카드 뒤에서 퍼지는 블루 글로우 배경. 인풋(아이콘 없음)과
    // 비밀번호 눈토글은 두 크기 공통(2026-09-16 사용자 결정).
    <main className="relative flex min-h-screen flex-col bg-slate-50 pt-14 pb-8 xl:items-center xl:justify-center xl:p-4">
      <div
        aria-hidden
        className="absolute inset-0 hidden xl:block"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 65% 55% at 50% 48%, rgba(191,219,254,0.65), transparent 70%), ' +
            'radial-gradient(circle at 18% 20%, rgba(191,219,254,0.3), transparent 40%), ' +
            'radial-gradient(circle at 85% 82%, rgba(219,234,254,0.25), transparent 45%)',
        }}
      />

      <Card
        className={
          'relative z-10 flex w-full flex-1 flex-col justify-between gap-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0 ' +
          '[--card-spacing:--spacing(6)] xl:max-w-md xl:flex-none xl:justify-normal xl:gap-(--card-spacing) xl:rounded-xl xl:bg-white ' +
          'xl:py-(--card-spacing) xl:shadow-[0_0_60px_rgba(15,23,42,0.2)] xl:[--card-spacing:--spacing(8)]'
        }
      >
        <div className="flex flex-col gap-(--card-spacing)">
          <CardHeader className="flex flex-col items-start gap-4 text-left xl:items-center xl:text-center">
            <img
              src="/safety-link-icon/icon-192.png"
              alt="Safety Link"
              className="h-16 w-16 rounded-[16px]"
            />
            <div className="flex flex-col gap-1.5">
              <h1 className="font-heading text-2xl leading-snug font-bold">Safety Link</h1>
              <p className="text-sm text-muted-foreground">민간경호관리 시스템 로그인</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-id">아이디</Label>
                <Input
                  id="login-id"
                  placeholder="아이디를 입력하세요"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="h-11 px-3.5"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-password">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 px-3.5 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="mt-1.5 h-11">
                로그인
              </Button>
            </form>
          </CardContent>
        </div>

        <p className="px-(--card-spacing) text-center text-xs text-muted-foreground">
          © 2026 S-TEC SYSTEM All rights reserved.
        </p>
      </Card>

      <ForceChangePasswordDialog
        open={forceChangeTargetId != null}
        id={forceChangeTargetId ?? ''}
        onSubmit={handleForceChangePassword}
      />
    </main>
  )
}

export default LoginPage
