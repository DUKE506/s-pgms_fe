import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { companyLogin } from '../api/auth'
import { useAuthStore } from '../store/authStore'

function CompanyLoginPage() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const setSession = useAuthStore((state) => state.setSession)
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const session = await companyLogin(id, password)
      setSession(session)
      navigate('/admin/dashboard')
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다')
    }
  }

  return (
    <main>
      <h1>본사 로그인</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="company-id">아이디</label>
        <input id="company-id" value={id} onChange={(e) => setId(e.target.value)} />

        <label htmlFor="company-password">비밀번호</label>
        <input
          id="company-password"
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

export default CompanyLoginPage
