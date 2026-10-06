import { useCallback, useEffect, useRef, useState } from 'react'
import { api, CATEGORY_LABELS, STATUS_LABELS, fmt, slaState } from '../api'
import { loadMacros, renderMacro, type Macro } from '../lib/macros'
import { allowedStatuses, needsConfirm } from '../lib/workflow'
import type { Me } from '../types'
import { MacroManager } from './MacroManager'
import { useToast } from './Toast'

type Props = {
  id: string
  me: Me
  isAdmin: boolean
  onChanged: () => void
  onClose: () => void
  onFilterCustomer: (email: string) => void
}

export function Workspace({ id, me, isAdmin, onChanged, onClose, onFilterCustomer }: Props) {
  const toast = useToast()
  const [t, setT] = useState<any>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [refundAmt, setRefundAmt] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [macros, setMacros] = useState<Macro[]>(loadMacros)
  const [showMacros, setShowMacros] = useState(false)
  const [collision, setCollision] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef(body)
  bodyRef.current = body
  const seenCount = useRef<number | null>(null)

  const load = useCallback(async () => {
    try { const r = await api.ticket(id); setT(r.ticket); setErr('') } catch (e: any) { setErr(e.message) }
  }, [id])

  useEffect(() => { load(); api.agents().then(r => setAgents(r.agents || [])).catch(() => {}) }, [load])
  useEffect(() => { const i = setInterval(load, 15000); return () => clearInterval(i) }, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [t?.messages?.length])

  // Collision detection: warn if another agent replied while this agent has an unsent draft.
  useEffect(() => {
    const msgs: any[] = t?.messages || []
    if (seenCount.current != null && msgs.length > seenCount.current && bodyRef.current.trim()) {
      const other = msgs.slice(seenCount.current).find(m => m.senderType !== 'customer' && !m.isInternalNote && m.senderName !== me.name)
      if (other) setCollision(`${other.senderName || 'Another agent'} just replied to this ticket.`)
    }
    if (t) seenCount.current = msgs.length
  }, [t, me.name])

  const run = async (fn: () => Promise<any>, success?: string) => {
    setBusy(true); setErr('')
    try { await fn(); await load(); onChanged(); if (success) toast(success, 'success') } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }

  const changeStatus = (to: string) => {
    if (needsConfirm(to) && !window.confirm(`Mark this ticket as ${STATUS_LABELS[to].toLowerCase()}?`)) return
    run(() => api.update(id, { status: to }), `Status set to ${STATUS_LABELS[to]}`)
  }

  const insertMacro = (m: Macro) => {
    const text = renderMacro(m.body, {
      customer: (t.customerName || '').split(' ')[0] || 'there',
      agent: me.name,
      ticket: t.ticketNumber,
    })
    setBody(b => (b.trim() ? `${b}\n\n${text}` : text))
    document.getElementById('reply-box')?.focus()
  }

  // `r` shortcut from the queue focuses the composer.
  useEffect(() => {
    const focus = () => document.getElementById('reply-box')?.focus()
    window.addEventListener('gdv:focus-reply', focus)
    return () => window.removeEventListener('gdv:focus-reply', focus)
  }, [])

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
        {collision && (
          <div className="alert warn-alert">
            ⚠ {collision} Review the thread before sending.
            <button className="link" onClick={() => setCollision('')}>Dismiss</button>
          </div>
        )}
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
            {macros.map(m => <button key={m.id} className="chip" onClick={() => insertMacro(m)}>{m.title}</button>)}
            <button className="chip" onClick={() => setShowMacros(true)}>⚙ Edit</button>
          </div>
          <textarea id="reply-box" rows={3} value={body} onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && body.trim() && !busy) document.getElementById('send-btn')?.click() }}
            placeholder={internal ? 'Internal note (not visible to the customer)…' : 'Reply to the customer… (Ctrl+Enter to send)'} className={internal ? 'note-box' : ''} />
          <div className="composer-bar">
            <label className="check"><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} /> Internal note</label>
            <button id="send-btn" className="btn primary" disabled={busy || !body.trim()}
              onClick={() => run(async () => {
                const r = await api.reply(id, body.trim(), internal)
                setBody(''); setCollision('')
                if (r.warning) setErr(r.warning)
              }, internal ? 'Note added' : 'Reply sent')}>
              {internal ? 'Add note' : 'Send reply'}
            </button>
          </div>
        </div>
      </div>

      <aside className="ws-side">
        <div className="card">
          <h3>Ticket</h3>
          <label>Status
            <select value={t.status} disabled={busy} onChange={e => changeStatus(e.target.value)}>
              {allowedStatuses(t.status).map(k => <option key={k} value={k}>{STATUS_LABELS[k] || k}</option>)}
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
          <label>Channel
            <select value={t.channel || 'email'} disabled={busy} onChange={e => run(() => api.update(id, { channel: e.target.value }), 'Channel updated')}>
              <option value="email">Email</option>
              <option value="app">App</option>
              <option value="phone">Phone</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="guest_web">Web (Guest)</option>
            </select>
          </label>
          {t.assignedAgentId !== me.userId && <button className="btn sm" disabled={busy} onClick={() => run(() => api.update(id, { assignedAgentId: 'me' }), 'Assigned to you')}>Assign to me</button>}
          <div className="kv"><span>First response SLA</span><span className={`sla ${sla.tone}`}>{sla.label}</span></div>
          <div className="kv"><span>Category</span><span>{CATEGORY_LABELS[t.category] || t.category}</span></div>
          <div className="kv"><span>Opened</span><span>{fmt(t.createdAt)}</span></div>
          {t.csatScore && <div className="kv"><span>CSAT</span><span>{t.csatScore}/5</span></div>}
        </div>

        <div className="card">
          <h3>Customer</h3>
          <div className="kv"><span>Name</span><span>{t.customerName || '—'}</span></div>
          <div className="kv"><span>Email</span><span className="break">{t.customerEmail}</span></div>
          <div className="kv"><span>Tickets</span><span>{t.customerTicketCount ?? '—'}</span></div>
          {t.customerEmail && <button className="btn sm" onClick={() => onFilterCustomer(t.customerEmail)}>View all their tickets</button>}
        </div>

        {bk && (
          <div className="card">
            <h3>Booking context</h3>
            <div className="kv"><span>Booking</span><span className="break">{bk.bookingId}</span></div>
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
                    <button className="btn primary sm" disabled={busy} onClick={() => run(() => api.decideRefund(id, true, ''), 'Refund approved')}>Approve</button>
                    <button className="btn danger sm" disabled={busy} onClick={() => { const n = window.prompt('Reason for rejection (optional)') ?? ''; run(() => api.decideRefund(id, false, n), 'Refund rejected') }}>Reject</button>
                  </div>
                  : <p className="muted small">Awaiting admin approval.</p>)}
                {t.refundStatus === 'approved' && isAdmin && <p className="muted small">Approved. Issue the payout from Razorpay, then resolve the ticket.</p>}
              </>
            ) : (
              <>
                <input placeholder="Amount" inputMode="decimal" value={refundAmt} onChange={e => setRefundAmt(e.target.value)} />
                <textarea rows={2} placeholder="Reason" value={refundReason} onChange={e => setRefundReason(e.target.value)} />
                <button className="btn sm" disabled={busy || !refundAmt || refundReason.trim().length < 5}
                  onClick={() => run(async () => { await api.requestRefund(id, parseFloat(refundAmt), refundReason.trim()); setRefundAmt(''); setRefundReason('') }, 'Refund approval requested')}>
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
      {showMacros && <MacroManager macros={macros} onChange={setMacros} onClose={() => setShowMacros(false)} />}
    </div>
  )
}
