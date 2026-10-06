import type { Ticket } from '../types'

export type SortKey = 'newest' | 'oldest' | 'priority' | 'sla'

export const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  priority: 'Priority',
  sla: 'SLA due soonest',
}

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
const time = (iso?: string | null) => (iso ? new Date(iso).getTime() : NaN)

export function sortTickets(tickets: Ticket[], sort: SortKey): Ticket[] {
  const list = tickets.slice()
  switch (sort) {
    case 'oldest':
      return list.sort((a, b) => time(a.createdAt) - time(b.createdAt))
    case 'priority':
      return list.sort((a, b) =>
        (PRIORITY_WEIGHT[a.priority] ?? 2) - (PRIORITY_WEIGHT[b.priority] ?? 2) ||
        time(b.createdAt) - time(a.createdAt))
    case 'sla': {
      // Tickets still waiting for a first response and having a due date come first, soonest due first.
      const due = (t: Ticket) =>
        t.firstResponseAt || ['resolved', 'closed'].includes(t.status) || !t.slaDueAt ? Infinity : time(t.slaDueAt)
      return list.sort((a, b) => (due(a) === due(b) ? 0 : due(a) < due(b) ? -1 : 1))
    }
    default:
      return list.sort((a, b) => time(b.createdAt) - time(a.createdAt))
  }
}

export function paginate<T>(items: T[], page: number, size: number): { items: T[]; pages: number; page: number } {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const p = Math.min(Math.max(1, page), pages)
  return { items: items.slice((p - 1) * size, p * size), pages, page: p }
}
