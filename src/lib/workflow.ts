/** Ticket status workflow rules. */

const TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'waiting_on_customer', 'resolved', 'closed'],
  in_progress: ['open', 'waiting_on_customer', 'resolved', 'closed'],
  waiting_on_customer: ['open', 'in_progress', 'resolved', 'closed'],
  resolved: ['open', 'in_progress', 'closed'],
  closed: ['open'], // reopen only
}

/** Statuses selectable from the given one (always includes the current status). */
export function allowedStatuses(current: string): string[] {
  return [current, ...(TRANSITIONS[current] || [])]
}

export function isAllowedTransition(from: string, to: string): boolean {
  return from === to || (TRANSITIONS[from] || []).includes(to)
}

/** Resolving/closing ends the SLA clock, so ask the agent to confirm. */
export function needsConfirm(to: string): boolean {
  return to === 'resolved' || to === 'closed'
}
