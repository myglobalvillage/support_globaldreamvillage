import { useState } from 'react'
import { api, CATEGORY_LABELS } from '../api'

export function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
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
        <div className="modal-header-brand">
          <img src="/gdv-icon.png" alt="Global Dream Village" className="modal-emblem" />
          <div>
            <h2>Log a ticket for a customer</h2>
            <p className="muted small">Global Dream Village Guest & Host Support Intake</p>
          </div>
        </div>
        {err && <div className="alert">{err}</div>}
        <label>Customer email<input autoFocus required type="email" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} /></label>
        <div className="grid3">
          <label>Channel<select value={form.channel} onChange={e => set('channel', e.target.value)}>{['phone', 'whatsapp', 'email'].map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Category<select value={form.category} onChange={e => set('category', e.target.value)}>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Priority<select value={form.priority} onChange={e => set('priority', e.target.value)}>{['low', 'normal', 'high', 'urgent'].map(p => <option key={p}>{p}</option>)}</select></label>
        </div>
        <label>Booking ID (optional)<input value={form.bookingId} onChange={e => set('bookingId', e.target.value)} /></label>
        <label>Subject<input required minLength={5} value={form.subject} onChange={e => set('subject', e.target.value)} /></label>
        <label>Details<textarea required minLength={10} rows={4} value={form.description} onChange={e => set('description', e.target.value)} /></label>
        <div className="row-gap end">
          <button type="button" className="btn ghost dark" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Create ticket'}</button>
        </div>
      </form>
    </div>
  )
}
