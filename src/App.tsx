import { useCallback, useEffect, useState } from 'react'
import { api, AuthError, clearToken, getToken } from './api'
import { Login } from './components/Login'
import { Shell } from './components/Shell'
import type { Me } from './types'

export default function App() {
  const [me, setMe] = useState<Me | null>(null)
  const [booting, setBooting] = useState(!!getToken())
  const [authError, setAuthError] = useState('')

  const boot = useCallback(async (userId?: string, fallback?: { name: string; email: string }) => {
    try {
      await api.stats() // 403 for non-staff
      const res = await api.agents()
      const stored = userId || localStorage.getItem('gdv_support_uid') || ''
      const found = (res.agents || []).find((a: any) => a.userId === stored)
      if (!found) throw new Error('Could not identify your support profile.')
      setMe({ userId: found.userId, name: found.name || fallback?.name || '', email: found.email, role: found.role })
      setAuthError('')
    } catch (e: any) {
      clearToken()
      localStorage.removeItem('gdv_support_uid')
      setMe(null)
      setAuthError(e instanceof AuthError ? e.message : (e.message || 'Support access required.'))
    } finally {
      setBooting(false)
    }
  }, [])

  useEffect(() => { if (getToken()) boot() }, [boot])

  const logout = useCallback(() => { clearToken(); localStorage.removeItem('gdv_support_uid'); setMe(null) }, [])

  if (booting) return <div className="center"><div className="spinner" /></div>
  if (!me) return <Login error={authError} onLoggedIn={boot} />
  return <Shell me={me} onLogout={logout} />
}
