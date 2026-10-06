import { useState } from 'react'
import { api, setToken } from '../api'

export function Login({ error, onLoggedIn }: { error: string; onLoggedIn: (id: string, fb: { name: string; email: string }) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(error)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const res = await api.login(email.trim(), password)
      setToken(res.data.token)
      localStorage.setItem('gdv_support_uid', String(res.data.userId))
      onLoggedIn(String(res.data.userId), { name: res.data.name, email: res.data.email })
    } catch (e: any) {
      setErr(e.message || 'Sign in failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">GDV</div>
        <h1>Support Console</h1>
        <p className="muted">Sign in with your staff account.</p>
        {err && <div className="alert">{err}</div>}
        <label>Email<input id="login-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label>
        <label>Password<input id="login-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button id="login-submit" className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
