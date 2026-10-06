import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, AuthError, CATEGORY_LABELS, STATUS_LABELS, slaState } from '../api'
import { useShortcuts } from '../hooks/useShortcuts'
import { beep, desktopNotify, requestNotifyPermission } from '../lib/alerts'
import { paginate, SORT_LABELS, sortTickets, type SortKey } from '../lib/queue'
import { loadViews, saveViews, type SavedView } from '../lib/views'
import { isAllowedTransition } from '../lib/workflow'
import type { Me, QueueFilter, Ticket, View } from '../types'
import { NewTicketModal } from './NewTicketModal'
import { Team } from './Team'
import { useToast } from './Toast'
import { Workspace } from './Workspace'

const PAGE_SIZE = 25

export const FILTERS: QueueFilter[] = [
  { id: 'active', label: 'Active', params: { status: 'open,in_progress,waiting_on_customer' } },
  { id: 'unassigned', label: 'Unassigned', params: { assigned: 'unassigned', status: 'open,in_progress' } },
  { id: 'mine', label: 'Mine', params: { assigned: 'me', status: 'open,in_progress,waiting_on_customer' } },
  { id: 'overdue', label: 'SLA breached', params: { overdue: '1' } },
  { id: 'refund', label: 'Refund pending', params: { refund: 'requested' } },
  { id: 'done', label: 'Resolved/closed', params: { status: 'resolved,closed' } },
]

const SHORTCUT_HELP: [string, string][] = [
  ['j / k', 'Next / previous ticket'],
  ['r', 'Reply to selected ticket'],
  ['n', 'Log a new ticket'],
  ['/', 'Search'],
  ['Esc', 'Close ticket / leave field'],
  ['Ctrl+Enter', 'Send reply'],
  ['?', 'Show this help'],
]

export function Shell({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const toast = useToast()
  const [view, setView] = useState<View>('queue')
  const [filter, setFilter] = useState<QueueFilter>(FILTERS[0])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [page, setPage] = useState(1)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [views, setViews] = useState<SavedView[]>(loadViews)
  const [bulkBusy, setBulkBusy] = useState(false)
  const known = useRef<{ key: string; ids: Set<string> } | null>(null)
  const isAdmin = me.role === 'admin' || me.role === 'support_admin'

  useEffect(() => { requestNotifyPermission() }, [])

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        api.tickets({ ...filter.params, ...(search ? { q: search } : {}) }),
        api.stats(),
      ])
      const list: Ticket[] = t.tickets || []
      setTickets(list); setTotal(t.total || list.length); setStats(s.stats)

      // New-ticket alert: only after the first load of this filter/search combination.
      const key = `${filter.id}|${search}`
      const ids = new Set(list.map(x => x.ticketId))
      if (known.current && known.current.key === key) {
        const fresh = list.filter(x => !known.current!.ids.has(x.ticketId))
        if (fresh.length) {
          beep()
          toast(fresh.length === 1 ? `New ticket: ${fresh[0].subject}` : `${fresh.length} new tickets`, 'info')
          desktopNotify('New support ticket', fresh[0].subject)
        }
      }
      known.current = { key, ids }
    } catch (e: any) {
      if (e instanceof AuthError) onLogout()
    } finally { setLoading(false) }
  }, [filter, search, onLogout, toast])

  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(handle)
  }, [load, search])

  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])
  useEffect(() => { setPage(1); setChecked(new Set()) }, [filter, search, sort])
  useEffect(() => { document.title = stats?.unassigned ? `(${stats.unassigned}) Support Console` : 'Support Console' }, [stats?.unassigned])

  const sorted = useMemo(() => sortTickets(tickets, sort), [tickets, sort])
  const pageData = useMemo(() => paginate(sorted, page, PAGE_SIZE), [sorted, page])
  const visible = pageData.items

  const move = (delta: number) => {
    if (!visible.length) return
    const idx = visible.findIndex(t => t.ticketId === selected)
    const next = idx === -1 ? (delta > 0 ? 0 : visible.length - 1) : Math.min(visible.length - 1, Math.max(0, idx + delta))
    setSelected(visible[next].ticketId)
  }

  useShortcuts({
    j: () => move(1),
    k: () => move(-1),
    n: () => setShowNew(true),
    r: () => window.dispatchEvent(new Event('gdv:focus-reply')),
    '/': () => document.getElementById('queue-search')?.focus(),
    '?': () => setShowHelp(s => !s),
    Escape: () => { setShowHelp(false); setShowNew(false); setSelected(null) },
  })

  const toggleCheck = (id: string) => setChecked(c => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allChecked = visible.length > 0 && visible.every(t => checked.has(t.ticketId))
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(visible.map(t => t.ticketId)))

  const bulk = async (label: string, data: (t: Ticket) => Record<string, unknown> | null) => {
    const targets = tickets.filter(t => checked.has(t.ticketId))
    setBulkBusy(true)
    let ok = 0, failed = 0, skipped = 0
    await Promise.all(targets.map(async t => {
      const patch = data(t)
      if (!patch) { skipped++; return }
      try { await api.update(t.ticketId, patch); ok++ } catch { failed++ }
    }))
    setBulkBusy(false); setChecked(new Set()); load()
    const parts = [`${ok} updated`, failed && `${failed} failed`, skipped && `${skipped} skipped (not allowed)`].filter(Boolean)
    toast(`${label}: ${parts.join(', ')}`, failed ? 'error' : 'success')
  }

  const bulkStatus = (to: string) => {
    if ((to === 'resolved' || to === 'closed') && !window.confirm(`Mark ${checked.size} ticket(s) as ${STATUS_LABELS[to].toLowerCase()}?`)) return
    bulk('Status', t => (isAllowedTransition(t.status, to) ? { status: to } : null))
  }

  const saveView = () => {
    const label = window.prompt('Name this view')?.trim()
    if (!label) return
    const next = [...views, { id: `v-${Date.now()}`, label, filterId: filter.id, search, sort }]
    setViews(next); saveViews(next)
  }
  const removeView = (id: string) => { const next = views.filter(v => v.id !== id); setViews(next); saveViews(next) }
  const applyView = (v: SavedView) => { setFilter(FILTERS.find(f => f.id === v.filterId) || FILTERS[0]); setSearch(v.search); setSort(v.sort) }

  const filterCustomer = (email: string) => { setFilter(FILTERS[0]); setSearch(email); setSelected(null) }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="logo"><span className="brand-mark sm">GDV</span> Support Console</div>
        <nav>
          <button className={view === 'queue' ? 'tab active' : 'tab'} onClick={() => setView('queue')}>Queue</button>
          {isAdmin && <button className={view === 'team' ? 'tab active' : 'tab'} onClick={() => setView('team')}>Team</button>}
        </nav>
        <div className="who">
          <button className="btn ghost sm" title="Keyboard shortcuts" onClick={() => setShowHelp(true)}>⌨ ?</button>
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
                <input id="queue-search" placeholder="Search ticket #, subject or booking… ( / )" value={search} onChange={e => setSearch(e.target.value)} />
                <button id="new-ticket-btn" className="btn primary sm" onClick={() => setShowNew(true)}>+ Log ticket</button>
              </div>
              <div className="chips">
                {FILTERS.map(f => (
                  <button key={f.id} className={f.id === filter.id ? 'chip active' : 'chip'} onClick={() => setFilter(f)}>{f.label}</button>
                ))}
              </div>
              {views.length > 0 && (
                <div className="chips views">
                  {views.map(v => (
                    <span key={v.id} className="chip view">
                      <button className="link" onClick={() => applyView(v)}>★ {v.label}</button>
                      <button className="link x" aria-label={`Delete view ${v.label}`} onClick={() => removeView(v.id)}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="toolbar">
                <label className="check"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all on page" /></label>
                <span className="muted small">{total} ticket{total === 1 ? '' : 's'}</span>
                <select className="sort" value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Sort tickets">
                  {Object.entries(SORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="chip" onClick={saveView}>★ Save view</button>
              </div>
              {checked.size > 0 && (
                <div className="bulkbar">
                  <strong>{checked.size} selected</strong>
                  <button className="btn sm" disabled={bulkBusy} onClick={() => bulk('Assign', () => ({ assignedAgentId: 'me' }))}>Assign to me</button>
                  <select disabled={bulkBusy} value="" onChange={e => e.target.value && bulkStatus(e.target.value)} aria-label="Bulk set status">
                    <option value="">Set status…</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select disabled={bulkBusy} value="" onChange={e => e.target.value && bulk('Priority', () => ({ priority: e.target.value }))} aria-label="Bulk set priority">
                    <option value="">Set priority…</option>
                    {['low', 'normal', 'high', 'urgent'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              )}
              {loading ? <div className="center pad"><div className="spinner" /></div> :
                visible.length === 0 ? <div className="empty">Nothing here. 🎉</div> :
                  visible.map(t => {
                    const sla = slaState(t)
                    return (
                      <div key={t.ticketId} id={`row-${t.ticketNumber}`} className={t.ticketId === selected ? 'row active' : 'row'} onClick={() => setSelected(t.ticketId)}>
                        <div className="row-top">
                          <label className="check" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={checked.has(t.ticketId)} onChange={() => toggleCheck(t.ticketId)} aria-label={`Select ${t.ticketNumber}`} />
                          </label>
                          <strong className="subject">{t.subject}</strong>
                          <span className={`pill p-${t.priority}`}>{t.priority}</span>
                        </div>
                        <div className="muted small indent">
                          {t.ticketNumber} · {t.customerName || t.customerEmail} · {CATEGORY_LABELS[t.category] || t.category}
                          {t.assignedAgentName && ` · 👤 ${t.assignedAgentName}`}
                        </div>
                        <div className="row-bottom indent">
                          <span className={`status s-${t.status}`}>{STATUS_LABELS[t.status]}</span>
                          <span className="muted small">{t.channel === 'guest_web' ? 'web (guest)' : t.channel}</span>
                          <span className={`sla ${sla.tone}`}>{sla.label}</span>
                          {t.refundStatus === 'requested' && <span className="pill p-high">refund?</span>}
                        </div>
                      </div>
                    )
                  })}
              {pageData.pages > 1 && (
                <div className="pager">
                  <button className="btn sm" disabled={pageData.page <= 1} onClick={() => setPage(pageData.page - 1)}>← Prev</button>
                  <span className="muted small">Page {pageData.page} of {pageData.pages}</span>
                  <button className="btn sm" disabled={pageData.page >= pageData.pages} onClick={() => setPage(pageData.page + 1)}>Next →</button>
                </div>
              )}
            </aside>
            <section className={selected ? 'work' : 'work hide-mobile'}>
              {selected
                ? <Workspace key={selected} id={selected} me={me} isAdmin={isAdmin} onChanged={load} onClose={() => setSelected(null)} onFilterCustomer={filterCustomer} />
                : <div className="empty big">Select a ticket to start.<div className="muted small">Tip: press <kbd>j</kbd> / <kbd>k</kbd> to move, <kbd>?</kbd> for shortcuts.</div></div>}
            </section>
          </main>
        </>
      )}
      {showNew && <NewTicketModal onClose={() => setShowNew(false)} onCreated={id => { setShowNew(false); load(); setSelected(id); toast('Ticket created', 'success') }} />}
      {showHelp && (
        <div className="modal-back" onClick={() => setShowHelp(false)}>
          <div className="modal small-modal" onClick={e => e.stopPropagation()}>
            <h2>Keyboard shortcuts</h2>
            {SHORTCUT_HELP.map(([k, d]) => <div key={k} className="kv"><span><kbd>{k}</kbd></span><span>{d}</span></div>)}
            <div className="row-gap end"><button className="btn primary" onClick={() => setShowHelp(false)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: 'bad' | 'warn' }) {
  return <div className={`stat ${tone || ''}`}><div className="stat-v">{value}</div><div className="stat-l">{label}</div></div>
}
