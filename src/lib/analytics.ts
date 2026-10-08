import type { AnalyticsData, AnalyticsPeriod, Ticket } from '../types'

export function computeAnalyticsFromTickets(
  tickets: Ticket[],
  period: AnalyticsPeriod,
  agents: any[] = []
): AnalyticsData {
  const now = new Date()
  let days = 30
  if (period === 'week') days = 7
  else if (period === 'quarter') days = 90
  else if (period === 'year') days = 365

  const startDate = new Date(now.getTime() - days * 24 * 3600 * 1000)

  // Filter tickets raised in period
  const raised = tickets.filter(t => {
    if (!t.createdAt) return true
    const d = new Date(t.createdAt)
    return !isNaN(d.getTime()) && d >= startDate
  })

  // Filter tickets resolved in period
  const resolved = tickets.filter(t => {
    const isResolved = ['resolved', 'closed'].includes(t.status)
    if (!isResolved) return false
    const d = t.resolvedAt ? new Date(t.resolvedAt) : t.updatedAt ? new Date(t.updatedAt) : null
    return d ? d >= startDate : true
  })

  const totalRaised = raised.length
  const totalResolved = resolved.length
  const resolutionRate = totalRaised > 0 ? Math.round((totalResolved / totalRaised) * 1000) / 10 : 100.0

  // SLA Compliance
  let slaEligible = 0
  let metSlaCount = 0
  for (const t of raised) {
    if (t.slaDueAt) {
      slaEligible++
      const due = new Date(t.slaDueAt).getTime()
      if (t.firstResponseAt) {
        if (new Date(t.firstResponseAt).getTime() <= due) metSlaCount++
      } else if (now.getTime() <= due) {
        metSlaCount++
      }
    }
  }
  const slaComplianceRate = slaEligible > 0 ? Math.round((metSlaCount / slaEligible) * 1000) / 10 : 100.0

  // Avg first response time (hours)
  const respTimes: number[] = []
  for (const t of raised) {
    if (t.firstResponseAt && t.createdAt) {
      const diff = (new Date(t.firstResponseAt).getTime() - new Date(t.createdAt).getTime()) / 3600000
      if (diff >= 0) respTimes.push(diff)
    }
  }
  const avgFirstResponseHours = respTimes.length > 0 ? Math.round((respTimes.reduce((a, b) => a + b, 0) / respTimes.length) * 10) / 10 : null

  // Avg resolution time (hours)
  const resTimes: number[] = []
  for (const t of resolved) {
    if (t.resolvedAt && t.createdAt) {
      const diff = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000
      if (diff >= 0) resTimes.push(diff)
    }
  }
  const avgResolutionHours = resTimes.length > 0 ? Math.round((resTimes.reduce((a, b) => a + b, 0) / resTimes.length) * 10) / 10 : null

  // CSAT
  const csats = raised.map(t => t.csatScore).filter((s): s is number => typeof s === 'number' && s > 0)
  const avgCsat = csats.length > 0 ? Math.round((csats.reduce((a, b) => a + b, 0) / csats.length) * 10) / 10 : null

  // Breakdowns
  const byCategory: Record<string, number> = {}
  for (const t of raised) {
    const k = t.category || 'other'
    byCategory[k] = (byCategory[k] || 0) + 1
  }

  const byChannel: Record<string, number> = {}
  for (const t of raised) {
    const k = t.channel || 'app'
    byChannel[k] = (byChannel[k] || 0) + 1
  }

  const byPriority: Record<string, number> = {}
  for (const t of raised) {
    const k = t.priority || 'normal'
    byPriority[k] = (byPriority[k] || 0) + 1
  }

  const byStatus: Record<string, number> = {}
  for (const t of raised) {
    const k = t.status || 'open'
    byStatus[k] = (byStatus[k] || 0) + 1
  }

  // Trend points
  const trend: { label: string; raised: number; resolved: number }[] = []
  if (period === 'week') {
    for (let i = 6; i >= 0; i--) {
      const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1)
      const label = dStart.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
      const rCount = raised.filter(t => {
        if (!t.createdAt) return false
        const cd = new Date(t.createdAt)
        return cd >= dStart && cd < dEnd
      }).length
      const sCount = resolved.filter(t => {
        const rd = t.resolvedAt ? new Date(t.resolvedAt) : null
        return rd ? rd >= dStart && rd < dEnd : false
      }).length
      trend.push({ label, raised: rCount, resolved: sCount })
    }
  } else if (period === 'quarter') {
    for (let i = 2; i >= 0; i--) {
      const dStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const label = dStart.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      const rCount = raised.filter(t => {
        if (!t.createdAt) return false
        const cd = new Date(t.createdAt)
        return cd >= dStart && cd < dEnd
      }).length
      const sCount = resolved.filter(t => {
        const rd = t.resolvedAt ? new Date(t.resolvedAt) : null
        return rd ? rd >= dStart && rd < dEnd : false
      }).length
      trend.push({ label, raised: rCount, resolved: sCount })
    }
  } else {
    // 4 weekly buckets for month
    for (let i = 3; i >= 0; i--) {
      const dStart = new Date(now.getTime() - (i + 1) * 7 * 86400000)
      const dEnd = new Date(now.getTime() - i * 7 * 86400000)
      const label = `${dStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${dEnd.toLocaleDateString(undefined, { day: 'numeric' })}`
      const rCount = raised.filter(t => {
        if (!t.createdAt) return false
        const cd = new Date(t.createdAt)
        return cd >= dStart && cd < dEnd
      }).length
      const sCount = resolved.filter(t => {
        const rd = t.resolvedAt ? new Date(t.resolvedAt) : null
        return rd ? rd >= dStart && rd < dEnd : false
      }).length
      trend.push({ label, raised: rCount, resolved: sCount })
    }
  }

  // Agent Performance
  const agentPerformance = (agents || []).map(a => {
    const aid = String(a.userId)
    const aHandled = raised.filter(t => String(t.assignedAgentId) === aid)
    const aResolved = resolved.filter(t => String(t.assignedAgentId) === aid)
    const aRespTimes = aHandled
      .filter(t => t.firstResponseAt && t.createdAt)
      .map(t => (new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt!).getTime()) / 3600000)
    const aCsat = aHandled.map(t => t.csatScore).filter((s): s is number => typeof s === 'number')

    return {
      userId: aid,
      name: a.name || a.email,
      role: a.role || 'agent',
      handled: aHandled.length,
      resolved: aResolved.length,
      avgFirstResponseHours: aRespTimes.length > 0 ? Math.round((aRespTimes.reduce((x, y) => x + y, 0) / aRespTimes.length) * 10) / 10 : null,
      avgCsat: aCsat.length > 0 ? Math.round((aCsat.reduce((x, y) => x + y, 0) / aCsat.length) * 10) / 10 : null,
    }
  }).sort((a, b) => b.handled - a.handled)

  return {
    period,
    dateRange: { start: startDate.toISOString(), end: now.toISOString() },
    summary: {
      totalRaised,
      totalResolved,
      resolutionRate,
      slaComplianceRate,
      avgFirstResponseHours,
      avgResolutionHours,
      avgCsat,
    },
    trend,
    byCategory,
    byChannel,
    byPriority,
    byStatus,
    agentPerformance,
  }
}
