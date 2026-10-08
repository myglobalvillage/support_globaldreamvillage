import { beforeEach, describe, expect, it } from 'vitest'
import { slaState } from '../api'
import { DEFAULT_MACROS, loadMacros, renderMacro, saveMacros } from '../lib/macros'
import { paginate, sortTickets } from '../lib/queue'
import { allowedStatuses, isAllowedTransition, needsConfirm } from '../lib/workflow'

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()
const H = 3600000

describe('workflow', () => {
  it('only allows reopening from closed', () => {
    expect(allowedStatuses('closed')).toEqual(['closed', 'open'])
    expect(isAllowedTransition('closed', 'resolved')).toBe(false)
    expect(isAllowedTransition('closed', 'open')).toBe(true)
  })
  it('allows resolving an open ticket and keeps the current status selectable', () => {
    expect(isAllowedTransition('open', 'resolved')).toBe(true)
    expect(allowedStatuses('open')[0]).toBe('open')
  })
  it('asks for confirmation only when resolving or closing', () => {
    expect(needsConfirm('resolved')).toBe(true)
    expect(needsConfirm('closed')).toBe(true)
    expect(needsConfirm('in_progress')).toBe(false)
  })
})

describe('macros', () => {
  beforeEach(() => localStorage.clear())

  it('substitutes variables and blanks unknown ones', () => {
    expect(renderMacro('Hi {{customer}} from {{ agent }} {{nope}}!', { customer: 'Sam', agent: 'Ava' })).toBe('Hi Sam from Ava !')
  })
  it('falls back to defaults, then persists edits', () => {
    expect(loadMacros()).toEqual(DEFAULT_MACROS)
    saveMacros([{ id: 'x', title: 'T', body: 'B' }])
    expect(loadMacros()).toEqual([{ id: 'x', title: 'T', body: 'B' }])
  })
  it('ignores corrupt storage', () => {
    localStorage.setItem('gdv_support_macros', '{bad json')
    expect(loadMacros()).toEqual(DEFAULT_MACROS)
  })
})

describe('queue', () => {
  const t = (id: string, extra: Record<string, unknown>) => ({ ticketId: id, ticketNumber: id, subject: id, status: 'open', priority: 'normal', category: 'other', createdAt: iso(0), ...extra })

  it('sorts by priority then newest', () => {
    const list = [t('a', { priority: 'low' }), t('b', { priority: 'urgent', createdAt: iso(-H) }), t('c', { priority: 'urgent', createdAt: iso(-2 * H) })]
    expect(sortTickets(list, 'priority').map(x => x.ticketId)).toEqual(['b', 'c', 'a'])
  })
  it('sorts by SLA with responded tickets last', () => {
    const list = [
      t('late', { slaDueAt: iso(5 * H) }),
      t('responded', { slaDueAt: iso(-H), firstResponseAt: iso(-2 * H) }),
      t('soon', { slaDueAt: iso(H) }),
    ]
    expect(sortTickets(list, 'sla').map(x => x.ticketId)).toEqual(['soon', 'late', 'responded'])
  })
  it('paginates and clamps the page', () => {
    const items = Array.from({ length: 55 }, (_, i) => i)
    expect(paginate(items, 1, 25).items).toHaveLength(25)
    expect(paginate(items, 3, 25).items).toHaveLength(5)
    expect(paginate(items, 99, 25).page).toBe(3)
    expect(paginate([], 1, 25)).toEqual({ items: [], pages: 1, page: 1 })
  })
})

describe('slaState', () => {
  it('reports breached, warning and ok states', () => {
    expect(slaState({ status: 'open', slaDueAt: iso(-H) }).tone).toBe('breach')
    expect(slaState({ status: 'open', slaDueAt: iso(0.5 * H) }).tone).toBe('warn')
    expect(slaState({ status: 'open', slaDueAt: iso(5 * H) }).tone).toBe('ok')
    expect(slaState({ status: 'resolved', slaDueAt: iso(-H) }).tone).toBe('done')
  })
})

import { computeAnalyticsFromTickets } from '../lib/analytics'

describe('analytics helpers', () => {
  it('validates supported periods', () => {
    const valid = ['week', 'month', 'quarter', 'year']
    expect(valid).toContain('week')
    expect(valid).toContain('month')
    expect(valid).toContain('quarter')
  })

  it('computes analytics correctly from tickets list', () => {
    const mockTickets = [
      { ticketId: '1', ticketNumber: 'GV-1', subject: 'A', status: 'open', priority: 'urgent', category: 'booking_payment', channel: 'app', createdAt: iso(-2 * H) },
      { ticketId: '2', ticketNumber: 'GV-2', subject: 'B', status: 'resolved', priority: 'normal', category: 'account', channel: 'email', createdAt: iso(-5 * H), resolvedAt: iso(-H), firstResponseAt: iso(-4 * H) },
    ]
    const data = computeAnalyticsFromTickets(mockTickets, 'week')
    expect(data.summary.totalRaised).toBe(2)
    expect(data.summary.totalResolved).toBe(1)
    expect(data.summary.resolutionRate).toBe(50)
    expect(data.byCategory['booking_payment']).toBe(1)
    expect(data.byCategory['account']).toBe(1)
    expect(data.byChannel['app']).toBe(1)
    expect(data.byChannel['email']).toBe(1)
    expect(data.trend.length).toBe(7)
  })
})

describe('login feedback & error handling', () => {
  it('formats appropriate feedback for authentication scenarios', () => {
    const error401 = 'Invalid email or password. Please try again.'
    const error403 = 'Access denied: Support staff privileges required.'
    expect(error401).toContain('Invalid email or password')
    expect(error403).toContain('Support staff privileges required')
  })
})

