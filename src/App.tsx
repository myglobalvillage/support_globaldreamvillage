import { useCallback, useEffect, useRef, useState } from 'react'
import {
  api, AuthError, clearToken, getToken, setToken,
  CATEGORY_LABELS, STATUS_LABELS, fmt, slaState,
} from './api'

type Me = { userId: string; name: string; email: string; role: 'admin' | 'support_admin' | 'agent' }
type View = 'queue' | 'team'

const FILTERS: { id: string; label: string; params: Record<string, string> }[] = [
  { id: 'active', label: 'Active', params: { status: 'open,in_progress,waiting_on_customer' } },
  { id: 'unassigned', label: 'Unassigned', params: { assigned: 'unassigned', status: 'open,in_progress' } },
  { id: 'mine', label: 'Mine', params: { assigned: 'me', status: 'open,in_progress,waiting_on_customer' } },
  { id: 'overdue', label: 'SLA breached', params: { overdue: '1' } },
  { id: 'refund', label: 'Refund pending', params: { refund: 'requested' } },
  { id: 'done', label: 'Resolved/closed', params: { status: 'resolved,closed' } },
]

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

  if (booting) return <div className="center"><div className="spinner" /></div>
  if (!me) return <Login error={authError} onLoggedIn={boot} />
  return <Shell me={me} onLogout={() => { clearToken(); localStorage.removeItem('gdv_support_uid'); setMe(null) }} />
}

// ---------------------------------------------------------------------------

function Login({ error, onLoggedIn }: { error: string; onLoggedIn: (id: string, fb: { name: string; email: string }) => void }) {
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

// ---------------------------------------------------------------------------

function Shell({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const [view, setView] = useState<View>('queue')
  const [filter, setFilter] = useState(FILTERS[0])
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const isAdmin = me.role === 'admin' || me.role === 'support_admin'

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        api.tickets({ ...filter.params, ...(search ? { q: search } : {}) }),
        api.stats(),
      ])
      setTickets(t.tickets || []); setTotal(t.total || 0); setStats(s.stats)
    } catch (e: any) {
      if (e instanceof AuthError) onLogout()
    } finally { setLoading(false) }
  }, [filter, search, onLogout])

  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(handle)
  }, [load, search])

  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

  return (
    <div className="shell">
      <header className="topbar">
        <div className="logo"><span className="brand-mark sm">GDV</span> Support Console</div>
        <nav>
          <button className={view === 'queue' ? 'tab active' : 'tab'} onClick={() => setView('queue')}>Queue</button>
          {isAdmin && <button className={view === 'team' ? 'tab active' : 'tab'} onClick={() => setView('team')}>Team</button>}
        </nav>
        <div className="who">
          <span>{me.name} <em>{me.role.replace('_', ' ')}</em></span>
          <button className="btn ghost" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      {view === 'team' ? <Team me={me} /> : (
        <>
          {stats && (
            <section className="stats">
              <Stat label="Unassigned" value={stats.unassigned} />
              <Stat label="Mine" value={stats.mine} />
              <Stat label="SLA breached" value={stats.overdue} tone={stats.overdue ? 'bad' : undefined} />
              <Stat label="Refunds pending" value={stats.refundsPending} tone={stats.refundsPending ? 'warn' : undefined} />
              <Stat label="Avg first reply (30d)" value={stats.avgFirstResponseHours30d != null ? `${stats.avgFirstResponseHours30d}h` : '—'} />
              <Stat label="CSAT" value={stats.avgCsat != null ? `${stats.avgCsat}/5` : '—'} />
            </section>
          )}
          <main className="split">
            <aside className={selected ? 'list hide-mobile' : 'list'}>
              <div className="list-head">
                <input id="queue-search" placeholder="Search ticket #, subject or booking…" value={search} onChange={e => setSearch(e.target.value)} />
                <button id="new-ticket-btn" className="btn primary sm" onClick={() => setShowNew(true)}>+ Log ticket</button>
              </div>
              <div className="chips">
                {FILTERS.map(f => (
                  <button key={f.id} className={f.id === filter.id ? 'chip active' : 'chip'} onClick={() => setFilter(f)}>{f.label}</button>
                ))}
              </div>
              <div className="muted small pad">{total} ticket{total === 1 ? '' : 's'}</div>
              {loading ? <div className="center pad"><div className="spinner" /></div> :
                tickets.length === 0 ? <div className="empty">Nothing here. 🎉</div> :
                  tickets.map(t => {
                    const sla = slaState(t)
                    return (
                      <div key={t.ticketId} id={`row-${t.ticketNumber}`} className={t.ticketId === selected ? 'row active' : 'row'} onClick={() => setSelected(t.ticketId)}>
                        <div className="row-top">
                          <strong>{t.subject}</strong>
                          <span className={`pill p-${t.priority}`}>{t.priority}</span>
                        </div>
                        <div className="muted small">{t.ticketNumber} · {t.customerName || t.customerEmail} · {CATEGORY_LABELS[t.category] || t.category}</div>
                        <div className="row-bottom">
                          <span className={`status s-${t.status}`}>{STATUS_LABELS[t.status]}</span>
                          <span className="muted small">{t.channel}</span>
                          <span className={`sla ${sla.tone}`}>{sla.label}</span>
                          {t.refundStatus === 'requested' && <span className="pill p-high">refund?</span>}
                        </div>
                      </div>
                    )
                  })}
            </aside>
            <section className={selected ? 'work' : 'work hide-mobile'}>
              {selected
                ? <Workspace key={selected} id={selected} me={me} isAdmin={isAdmin} onChanged={load} onClose={() => setSelected(null)} />
                : <div className="empty big">Select a ticket to start.</div>}
            </section>
          </main>
        </>
      )}
      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onCreated={id => { setShowNew(false); load(); setSelected(id) }} />}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: 'bad' | 'warn' }) {
  return <div className={`stat ${tone || ''}`}><div className="stat-v">{value}</div><div className="stat-l">{label}</div></div>
}

// ---------------------------------------------------------------------------

const CANNED: { title: string; body: string }[] = [
  { title: 'Payment under review', body: 'Thanks for reaching out. We are reconciling your payment with our payment partner and will confirm your booking status within a few hours. If the amount was debited but the booking fails, it is refunded automatically within 5-7 business days.' },
  { title: 'Need more details', body: 'Could you please share the booking ID, the email used on the booking and a screenshot of the issue so we can look into it right away?' },
  { title: 'Issue resolved', body: 'We have fixed this on our side. Please check and let us know if anything still looks wrong. We are happy to help further.' },
  { title: 'Refund initiated', body: 'We have approved your refund. It will reach the original payment method within 5-7 business days depending on your bank.' },
]

function Workspace({ id, me, isAdmin, onChanged, onClose }: { id: string; me: Me; isAdmin: boolean; onChanged: () => void; onClose: () => void }) {
  const [t, setT] = useState<any>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [refundAmt, setRefundAmt] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try { const r = await api.ticket(id); setT(r.ticket); setErr('') } catch (e: any) { setErr(e.message) }
  }, [id])

  useEffect(() => { load(); api.agents().then(r => setAgents(r.agents || [])).catch(() => {}) }, [load])
  useEffect(() => { const i = setInterval(load, 15000); return () => clearInterval(i) }, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [t?.messages?.length])

  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setErr('')
    try { await fn(); await load(); onChanged() } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  if (!t) return <div className="center pad">{err ? <div className="alert">{err}</div> : <div className="spinner" />}</div>

  const sla = slaState(t)
  const bk = t.booking

  return (
    <div className="ws">
      <div className="ws-main">
        <div className="ws-head">
          <button className="btn ghost sm show-mobile" onClick={onClose}>← Back</button>
          <div>
            <h2>{t.subject}</h2>
            <div className="muted small">{t.ticketNumber} · {t.customerName} ({t.customerEmail}) · via {t.channel} · {t.customerTicketCount} ticket(s) total</div>
          </div>
        </div>
        {err && <div className="alert">{err}</div>}
        <div className="thread">
          {(t.messages || []).map((m: any) => (
            <div key={m.messageId} className={`msg ${m.senderType === 'customer' ? 'cust' : 'agent'} ${m.isInternalNote ? 'note' : ''}`}>
              <div className="bubble">{m.body}</div>
              <div className="muted tiny">{m.isInternalNote ? '🔒 Internal note · ' : ''}{m.senderName} · {fmt(m.createdAt)}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="composer">
          <div className="canned">
            {CANNED.map(c => <button key={c.title} className="chip" onClick={() => setBody(c.body)}>{c.title}</button>)}
          </div>
          <textarea id="reply-box" rows={3} value={body} onChange={e => setBody(e.target.value)}
            placeholder={internal ? 'Internal note (not visible to the customer)…' : 'Reply to the customer…'} className={internal ? 'note-box' : ''} />
          <div className="composer-bar">
            <label className="check"><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> Internal note</label>
            <button id="send-btn" className="btn primary" disabled={busy || !body.trim()}
              onClick={() => run(async () => { const r = await api.reply(id, body.trim(), internal); setBody(''); if (r.warning) setErr(r.warning) })}>
              {internal ? 'Add note' : 'Send reply'}
            </button>
          </div>
        </div>
      </div>

      <aside className="ws-side">
        <div className="card">
          <h3>Ticket</h3>
          <label>Status
            <select value={t.status} disabled={busy} onChange={e => run(() => api.update(id, { status: e.target.value }))}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={t.priority} disabled={busy} onChange={e => run(() => api.update(id, { priority: e.target.value }))}>
              {['low', 'normal', 'high', 'urgent'].map(p => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label>Assignee
            <select value={t.assignedAgentId || ''} disabled={busy} onChange={e => run(() => api.update(id, { assignedAgentId: e.target.value || null }))}>
              <option value="">Unassigned</option>
              {agents.map(a => <option key={a.userId} value={a.userId}>{a.name}</option>)}
            </select>
          </label>
          {t.assignedAgentId !== me.userId && <button className="btn sm" disabled={busy} onClick={() => run(() => api.update(id, { assignedAgentId: 'me' }))}>Assign to me</button>}
          <div className="kv"><span>First response SLA</span><span className={`sla ${sla.tone}`}>{sla.label}</span></div>
          <div className="kv"><span>Category</span><span>{CATEGORY_LABELS[t.category] || t.category}</span></div>
          <div className="kv"><span>Opened</span><span>{fmt(t.createdAt)}</span></div>
          {t.csatScore && <div className="kv"><span>CSAT</span><span>{t.csatScore}/5</span></div>}
        </div>

        {bk && (
          <div className="card">
            <h3>Booking context</h3>
            <div className="kv"><span>Booking</span><span>{bk.bookingId}</span></div>
            <div className="kv"><span>Stay</span><span>{bk.startDate} → {bk.endDate}</span></div>
            <div className="kv"><span>Status</span><span>{bk.status}</span></div>
            <div className="kv"><span>Payment</span><span>{bk.paymentStatus}</span></div>
            <div className="kv"><span>Total</span><span>{bk.finalPrice} {bk.currency}</span></div>
            <div className="kv"><span>Refund</span><span>{bk.refundStatus || '—'}</span></div>
            <div className="kv"><span>Guest</span><span>{bk.guestName}</span></div>
          </div>
        )}

        {t.bookingId && (
          <div className="card">
            <h3>Refund</h3>
            {t.refundStatus ? (
              <>
                <div className="kv"><span>Status</span><span className={`status r-${t.refundStatus}`}>{t.refundStatus}</span></div>
                <div className="kv"><span>Amount</span><span>{t.refundAmount}</span></div>
                <p className="muted small">{t.refundReason}</p>
                {t.refundStatus === 'requested' && (isAdmin
                  ? <div className="row-gap">
                    <button className="btn primary sm" disabled={busy} onClick={() => run(() => api.decideRefund(id, true, ''))}>Approve</button>
                    <button className="btn danger sm" disabled={busy} onClick={() => { const n = window.prompt('Reason for rejection (optional)') ?? ''; run(() => api.decideRefund(id, false, n)) }}>Reject</button>
                  </div>
                  : <p className="muted small">Awaiting admin approval.</p>)}
                {t.refundStatus === 'approved' && isAdmin && <p className="muted small">Approved. Issue the payout from Razorpay, then resolve the ticket.</p>}
              </>
            ) : (
              <>
                <input placeholder="Amount" inputMode="decimal" value={refundAmt} onChange={e => setRefundAmt(e.target.value)} />
                <textarea rows={2} placeholder="Reason" value={refundReason} onChange={e => setRefundReason(e.target.value)} />
                <button className="btn sm" disabled={busy || !refundAmt || refundReason.trim().length < 5}
                  onClick={() => run(async () => { await api.requestRefund(id, parseFloat(refundAmt), refundReason.trim()); setRefundAmt(''); setRefundReason('') })}>
                  Request refund approval
                </button>
              </>
            )}
          </div>
        )}

        <div className="card">
          <h3>Activity</h3>
          {(t.events || []).slice().reverse().slice(0, 15).map((ev: any) => (
            <div key={ev.eventId} className="ev"><b>{ev.action.replace(/_/g, ' ')}</b>{ev.newValue ? ` → ${ev.newValue}` : ''}<div className="muted tiny">{ev.actorName} · {fmt(ev.createdAt)}</div></div>
          ))}
        </div>
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({ customerEmail: '', channel: 'phone', category: 'other', priority: 'normal', bookingId: '', subject: '', description: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('')
    try {
      const r = await api.createTicket({ ...form, bookingId: form.bookingId || undefined })
      onCreated(r.ticket.ticketId)
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h2>Log a ticket for a customer</h2>
        <p className="muted small">For phone calls, WhatsApp chats and emails you handle outside the app.</p>
        {err && <div className="alert">{err}</div>}
        <label>Customer email<input required type="email" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} /></label>
        <div className="grid3">
          <label>Channel<select value={form.channel} onChange={e => set('channel', e.target.value)}>{['phone', 'whatsapp', 'email'].map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Category<select value={form.category} onChange={e => set('category', e.target.value)}>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Priority<select value={form.priority} onChange={e => set('priority', e.target.value)}>{['low', 'normal', 'high', 'urgent'].map(p => <option key={p}>{p}</option>)}</select></label>
        </div>
        <label>Booking ID (optional)<input value={form.bookingId} onChange={e => set('bookingId', e.target.value)} /></label>
        <label>Subject<input required minLength={5} value={form.subject} onChange={e => set('subject', e.target.value)} /></label>
        <label>Details<textarea required minLength={10} rows={4} value={form.description} onChange={e => set('description', e.target.value)} /></label>
        <div className="row-gap end">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Create ticket'}</button>
        </div>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Team({ me }: { me: Me }) {
  const [agents, setAgents] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('agent')
  const [msg, setMsg] = useState('')
  const canManage = me.role === 'admin'

  const load = useCallback(() => { api.agents().then(r => setAgents(r.agents || [])).catch(e => setMsg(e.message)) }, [])
  useEffect(load, [load])

  const save = async (em: string, r: string | null) => {
    setMsg('')
    try { await api.setAgentRole(em, r); setEmail(''); load(); setMsg('Saved.') } catch (e: any) { setMsg(e.message) }
  }

  return (
    <main className="team">
      <h2>Support team</h2>
      {msg && <div className="alert info">{msg}</div>}
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th /></tr></thead>
        <tbody>
          {agents.map(a => (
            <tr key={a.userId}>
              <td>{a.name}</td><td>{a.email}</td><td>{a.role}</td>
              <td>{canManage && a.role !== 'admin' && <button className="btn danger sm" onClick={() => save(a.email, null)}>Remove</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {canManage ? (
        <div className="card add-agent">
          <h3>Add team member</h3>
          <p className="muted small">The person must already have a Global Dream Village account.</p>
          <div className="row-gap">
            <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="agent">Agent</option>
              <option value="support_admin">Support admin (can approve refunds)</option>
            </select>
            <button className="btn primary" disabled={!email} onClick={() => save(email, role)}>Add</button>
          </div>
        </div>
      ) : <p className="muted small">Only a platform admin can add or remove team members.</p>}
    </main>
  )
}
