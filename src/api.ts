import config from './config'

const BASE = config.apiUrl
const TOKEN_KEY = 'gdv_support_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class AuthError extends Error {}

async function request(path: string, method = 'GET', body?: unknown): Promise<any> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data: any = {}
  try { data = await res.json() } catch { /* non-JSON error */ }
  if (res.status === 401) {
    clearToken()
    const errorMsg = data.message || data.error || (path.includes('/auth/login') ? 'Invalid email or password. Please try again.' : 'Session expired. Please sign in again.')
    throw new AuthError(errorMsg)
  }
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  login: (email: string, password: string) => request('/auth/login', 'POST', { email, password }),
  stats: () => request('/support/stats'),
  agents: () => request('/support/agents'),
  setAgentRole: (email: string, role: string | null) => request('/support/agents', 'PUT', { email, role }),
  tickets: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/support/tickets${qs ? `?${qs}` : ''}`)
  },
  ticket: (id: string) => request(`/support/tickets/${id}`),
  createTicket: (data: Record<string, unknown>) => request('/support/tickets', 'POST', data),
  reply: (id: string, body: string, isInternal = false) =>
    request(`/support/tickets/${id}/messages`, 'POST', { body, isInternal }),
  update: (id: string, data: Record<string, unknown>) => request(`/support/tickets/${id}`, 'PATCH', data),
  requestRefund: (id: string, amount: number, reason: string) =>
    request(`/support/tickets/${id}/refund-request`, 'POST', { amount, reason }),
  decideRefund: (id: string, approve: boolean, note: string) =>
    request(`/support/tickets/${id}/refund-decision`, 'POST', { approve, note }),
  analytics: (period = 'month') => request(`/support/analytics?period=${encodeURIComponent(period)}`),
  mailStatus: () => request('/support/mail/status'),
  syncMail: (query?: 'UNSEEN' | 'ALL') => request('/support/mail/sync', 'POST', { query }),
}

export const CATEGORY_LABELS: Record<string, string> = {
  booking_payment: 'Booking · Payment',
  booking_cancellation: 'Booking · Cancellation/Refund',
  booking_change: 'Booking · Change',
  booking_other: 'Booking · Other',
  account: 'Account',
  host_payout: 'Host · Payout',
  host_listing: 'Host · Listing',
  app_bug: 'App bug',
  other: 'Other',
}

export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_on_customer: 'Waiting on customer',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const CHANNEL_LABELS: Record<string, string> = {
  app: 'In-App',
  email: 'Email',
  whatsapp: 'WhatsApp',
  phone: 'Phone',
  guest_web: 'Web (Guest)',
}

export const fmt = (iso?: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) } catch { return iso }
}

/** Human readable SLA state for the queue. */
export function slaState(t: any): { label: string; tone: 'ok' | 'warn' | 'breach' | 'done' } {
  if (t.firstResponseAt || ['resolved', 'closed'].includes(t.status)) return { label: 'Responded', tone: 'done' }
  if (!t.slaDueAt) return { label: '—', tone: 'ok' }
  const ms = new Date(t.slaDueAt).getTime() - Date.now()
  const hrs = Math.abs(ms) / 3600000
  const text = hrs >= 1 ? `${Math.floor(hrs)}h ${Math.round((hrs % 1) * 60)}m` : `${Math.max(1, Math.round(hrs * 60))}m`
  if (ms < 0) return { label: `Breached ${text} ago`, tone: 'breach' }
  return { label: `${text} left`, tone: ms < 3600000 ? 'warn' : 'ok' }
}
