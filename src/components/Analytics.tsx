import { useCallback, useEffect, useState } from 'react'
import { api, CATEGORY_LABELS, STATUS_LABELS } from '../api'
import { computeAnalyticsFromTickets } from '../lib/analytics'
import type { AnalyticsData, AnalyticsPeriod, Me } from '../types'

interface Props {
  me: Me
  onDrillDown?: (filterParams: Record<string, string>) => void
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  week: 'This Week (7d)',
  month: 'This Month (30d)',
  quarter: 'This Quarter (90d)',
  year: 'Year-to-Date (12m)',
}

const CHANNEL_LABELS: Record<string, string> = {
  app: 'In-App',
  email: 'Email',
  whatsapp: 'WhatsApp',
  phone: 'Phone',
  guest_web: 'Web (Guest)',
}

export function Analytics({ onDrillDown }: Props) {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.analytics(period)
      setData(res)
    } catch (_err: any) {
      // If the backend /analytics endpoint returns 404 (e.g. Railway not yet redeployed),
      // seamlessly compute the analytics metrics client-side from live tickets and agents!
      try {
        const [ticketsRes, agentsRes] = await Promise.all([
          api.tickets({ limit: '100' }),
          api.agents().catch(() => ({ agents: [] })),
        ])
        const computed = computeAnalyticsFromTickets(
          ticketsRes.tickets || [],
          period,
          agentsRes.agents || [],
        )
        setData(computed)
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'Failed to load analytics data.')
      }
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="center pad">
        <div className="spinner" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="analytics-wrap pad">
        <div className="alert">{error}</div>
        <button className="btn primary sm" onClick={load}>Retry</button>
      </div>
    )
  }

  const s = data?.summary
  const trend = data?.trend || []
  const maxTrendVal = Math.max(1, ...trend.map(t => Math.max(t.raised, t.resolved)))

  return (
    <div className="analytics-container">
      {/* Top Header & Period Selector */}
      <div className="analytics-header">
        <div>
          <h2>Helpdesk Analytics</h2>
          <p className="muted small">
            Ticket volume, resolution performance, SLA health and agent metrics.
          </p>
        </div>
        <div className="period-pills">
          {(['week', 'month', 'quarter', 'year'] as AnalyticsPeriod[]).map(p => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
              disabled={loading}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
          <button className="btn ghost sm" onClick={load} title="Refresh analytics" disabled={loading}>
            🔄
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {/* KPI Cards */}
      {s && (
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Tickets Raised</div>
            <div className="kpi-value text-blue">{s.totalRaised}</div>
            <div className="kpi-meta muted tiny">Across selected period</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Tickets Resolved</div>
            <div className="kpi-value text-green">{s.totalResolved}</div>
            <div className="kpi-meta muted tiny">{s.resolutionRate}% resolution rate</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">SLA First Response</div>
            <div className={`kpi-value ${s.slaComplianceRate >= 90 ? 'text-green' : s.slaComplianceRate >= 75 ? 'text-amber' : 'text-red'}`}>
              {s.slaComplianceRate}%
            </div>
            <div className="kpi-meta muted tiny">Target met or active</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Avg First Reply</div>
            <div className="kpi-value">
              {s.avgFirstResponseHours != null ? `${s.avgFirstResponseHours}h` : '—'}
            </div>
            <div className="kpi-meta muted tiny">From ticket creation</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Customer CSAT</div>
            <div className="kpi-value text-amber">
              {s.avgCsat != null ? `${s.avgCsat} / 5` : '—'}
            </div>
            <div className="kpi-meta muted tiny">Based on verified ratings</div>
          </div>
        </section>
      )}

      {/* Visual Volume Trendline / Bar Chart */}
      <section className="analytics-card chart-card">
        <div className="chart-header">
          <div>
            <h3>Ticket Volume Trends</h3>
            <span className="muted small">Incoming vs resolved tickets over time</span>
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot raised" /> Raised</span>
            <span className="legend-item"><span className="legend-dot resolved" /> Resolved</span>
          </div>
        </div>

        {trend.length === 0 ? (
          <div className="empty">No activity recorded for this period.</div>
        ) : (
          <div className="bar-chart-container">
            <div className="bar-chart-grid">
              {trend.map((pt, idx) => {
                const raisedHeight = Math.round((pt.raised / maxTrendVal) * 100)
                const resolvedHeight = Math.round((pt.resolved / maxTrendVal) * 100)
                return (
                  <div key={idx} className="bar-group" title={`${pt.label}: ${pt.raised} raised, ${pt.resolved} resolved`}>
                    <div className="bars-pair">
                      <div className="bar bar-raised" style={{ height: `${Math.max(4, raisedHeight)}%` }}>
                        {pt.raised > 0 && <span className="bar-num">{pt.raised}</span>}
                      </div>
                      <div className="bar bar-resolved" style={{ height: `${Math.max(4, resolvedHeight)}%` }}>
                        {pt.resolved > 0 && <span className="bar-num">{pt.resolved}</span>}
                      </div>
                    </div>
                    <div className="bar-label">{pt.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Breakdowns Grid */}
      <section className="breakdown-grid">
        {/* By Category */}
        <div className="analytics-card">
          <div className="card-top">
            <h3>By Category</h3>
            <span className="muted tiny">Click to view in queue</span>
          </div>
          <div className="breakdown-list">
            {Object.entries(data?.byCategory || {}).length === 0 ? (
              <div className="empty small">No tickets</div>
            ) : (
              Object.entries(data?.byCategory || {})
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const pct = s?.totalRaised ? Math.round((count / s.totalRaised) * 100) : 0
                  return (
                    <div
                      key={cat}
                      className="breakdown-row clickable"
                      onClick={() => onDrillDown && onDrillDown({ category: cat })}
                    >
                      <div className="b-label-row">
                        <span>{CATEGORY_LABELS[cat] || cat}</span>
                        <strong>{count} <span className="muted small">({pct}%)</span></strong>
                      </div>
                      <div className="progress-bg">
                        <div className="progress-fill progress-blue" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        {/* By Channel */}
        <div className="analytics-card">
          <div className="card-top">
            <h3>By Ingestion Channel</h3>
          </div>
          <div className="breakdown-list">
            {Object.entries(data?.byChannel || {}).length === 0 ? (
              <div className="empty small">No tickets</div>
            ) : (
              Object.entries(data?.byChannel || {})
                .sort((a, b) => b[1] - a[1])
                .map(([ch, count]) => {
                  const pct = s?.totalRaised ? Math.round((count / s.totalRaised) * 100) : 0
                  return (
                    <div key={ch} className="breakdown-row">
                      <div className="b-label-row">
                        <span>{CHANNEL_LABELS[ch] || ch}</span>
                        <strong>{count} <span className="muted small">({pct}%)</span></strong>
                      </div>
                      <div className="progress-bg">
                        <div className="progress-fill progress-teal" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        {/* By Priority */}
        <div className="analytics-card">
          <div className="card-top">
            <h3>By Priority</h3>
          </div>
          <div className="breakdown-list">
            {Object.entries(data?.byPriority || {}).length === 0 ? (
              <div className="empty small">No tickets</div>
            ) : (
              Object.entries(data?.byPriority || {})
                .sort((a, b) => b[1] - a[1])
                .map(([prio, count]) => {
                  const pct = s?.totalRaised ? Math.round((count / s.totalRaised) * 100) : 0
                  const colorClass = prio === 'urgent' ? 'progress-red' : prio === 'high' ? 'progress-orange' : 'progress-blue'
                  return (
                    <div
                      key={prio}
                      className="breakdown-row clickable"
                      onClick={() => onDrillDown && onDrillDown({ priority: prio })}
                    >
                      <div className="b-label-row">
                        <span className={`pill p-${prio}`}>{prio}</span>
                        <strong>{count} <span className="muted small">({pct}%)</span></strong>
                      </div>
                      <div className="progress-bg">
                        <div className={`progress-fill ${colorClass}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        {/* By Status */}
        <div className="analytics-card">
          <div className="card-top">
            <h3>By Current Status</h3>
          </div>
          <div className="breakdown-list">
            {Object.entries(data?.byStatus || {}).length === 0 ? (
              <div className="empty small">No tickets</div>
            ) : (
              Object.entries(data?.byStatus || {})
                .sort((a, b) => b[1] - a[1])
                .map(([st, count]) => {
                  const pct = s?.totalRaised ? Math.round((count / s.totalRaised) * 100) : 0
                  return (
                    <div
                      key={st}
                      className="breakdown-row clickable"
                      onClick={() => onDrillDown && onDrillDown({ status: st })}
                    >
                      <div className="b-label-row">
                        <span className={`status s-${st}`}>{STATUS_LABELS[st] || st}</span>
                        <strong>{count} <span className="muted small">({pct}%)</span></strong>
                      </div>
                      <div className="progress-bg">
                        <div className="progress-fill progress-green" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </section>

      {/* Agent Performance Leaderboard Table */}
      <section className="analytics-card">
        <div className="card-top">
          <h3>Support Team Performance</h3>
          <span className="muted small">Metrics across assigned tickets in this period</span>
        </div>
        <div className="table-responsive">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Role</th>
                <th>Tickets Handled</th>
                <th>Resolved</th>
                <th>Avg First Reply</th>
                <th>CSAT Rating</th>
              </tr>
            </thead>
            <tbody>
              {(data?.agentPerformance || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty small">No agent assignment activity in this period.</td>
                </tr>
              ) : (
                data?.agentPerformance.map(a => (
                  <tr key={a.userId}>
                    <td><strong>{a.name}</strong></td>
                    <td><span className="role-tag">{a.role.replace('_', ' ')}</span></td>
                    <td>{a.handled}</td>
                    <td><span className="badge-resolved">{a.resolved}</span></td>
                    <td>{a.avgFirstResponseHours != null ? `${a.avgFirstResponseHours}h` : '—'}</td>
                    <td>{a.avgCsat != null ? `⭐ ${a.avgCsat}` : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
