import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { policeLogin } from '../api/auth'
import { useAuthStore } from '../store/authStore'

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
      navigate('/dashboard')
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다')
    }
  }

  return (
    <main>
      <h1>경찰 로그인</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="police-id">아이디</label>
        <input id="police-id" value={id} onChange={(e) => setId(e.target.value)} />

        <label htmlFor="police-password">비밀번호</label>
        <input
          id="police-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">로그인</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </main>
  )
}

export default PoliceLoginPage
