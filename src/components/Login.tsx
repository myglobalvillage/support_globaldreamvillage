import { useEffect, useState } from 'react'
import { api, setToken } from '../api'

type LoginStatus = 'idle' | 'authenticating' | 'verifying' | 'success' | 'error'

export function Login({ error, onLoggedIn }: { error: string; onLoggedIn: (id: string, fb: { name: string; email: string }) => Promise<void> | void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<LoginStatus>(error ? 'error' : 'idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [err, setErr] = useState(error)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (error) {
      setErr(error)
      setStatus('error')
    }
  }, [error])

  const isBusy = status === 'authenticating' || status === 'verifying' || status === 'success'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setSuccessMsg('')
    setStatus('authenticating')
    setStatusMsg('Verifying credentials...')

    try {
      const res = await api.login(email.trim(), password)
      if (!res?.data?.token) {
        throw new Error(res?.error || res?.message || 'Login failed. Please check credentials.')
      }

      setToken(res.data.token)
      localStorage.setItem('gdv_support_uid', String(res.data.userId))

      setStatus('verifying')
      setStatusMsg('Verifying support staff access...')

      await onLoggedIn(String(res.data.userId), { name: res.data.name, email: res.data.email })

      setStatus('success')
      setSuccessMsg(`Welcome, ${res.data.name || 'Staff'}! Signed in successfully. Loading console...`)
    } catch (e: any) {
      setStatus('error')
      setErr(e.message || 'Sign in failed. Please check your email and password.')
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand-header">
          <img
            src="/brand-logo.png"
            alt="Global Dream Village Logo"
            className="login-brand-logo"
          />
          <p className="login-motto">where every stay becomes a dream</p>
          <div className="login-brand-badge">SUPPORT OPERATIONS CENTER</div>
        </div>

        {status === 'success' && (
          <div className="alert success" role="status" aria-live="polite">
            <div className="alert-header">
              <span className="alert-icon">✓</span>
              <span>Authentication Successful</span>
            </div>
            <div className="alert-body">{successMsg}</div>
          </div>
        )}

        {status === 'error' && err && (
          <div className="alert error" role="alert" aria-live="assertive">
            <div className="alert-header">
              <span className="alert-icon">✕</span>
              <span>Sign in Failed</span>
            </div>
            <div className="alert-body">{err}</div>
          </div>
        )}

        {(status === 'authenticating' || status === 'verifying') && (
          <div className="login-status-bar" role="status" aria-live="polite">
            <div className="btn-spinner sm blue" />
            <span>{statusMsg}</span>
          </div>
        )}

        <label>
          Email
          <input
            id="login-email"
            type="email"
            required
            disabled={isBusy}
            value={email}
            onChange={e => { setEmail(e.target.value); if (status === 'error') { setErr(''); setStatus('idle') } }}
            autoComplete="username"
            placeholder="staff@globaldreamvillage.com"
          />
        </label>

        <label>
          Password
          <input
            id="login-password"
            type="password"
            required
            disabled={isBusy}
            value={password}
            onChange={e => { setPassword(e.target.value); if (status === 'error') { setErr(''); setStatus('idle') } }}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>

        <button id="login-submit" className="btn primary" disabled={isBusy}>
          {status === 'authenticating' ? (
            <span className="btn-loader">
              <span className="btn-spinner" />
              <span>Authenticating…</span>
            </span>
          ) : status === 'verifying' ? (
            <span className="btn-loader">
              <span className="btn-spinner" />
              <span>Verifying access…</span>
            </span>
          ) : status === 'success' ? (
            <span className="btn-loader">
              <span>✓</span>
              <span>Signed in</span>
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  )
}
