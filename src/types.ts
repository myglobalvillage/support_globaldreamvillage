export type Role = 'admin' | 'support_admin' | 'agent'
export type Me = { userId: string; name: string; email: string; role: Role }
export type View = 'queue' | 'team'

export type Ticket = {
  ticketId: string
  ticketNumber: string
  subject: string
  status: string
  priority: string
  category: string
  channel?: string
  customerName?: string
  customerEmail?: string
  assignedAgentId?: string | null
  slaDueAt?: string | null
  firstResponseAt?: string | null
  refundStatus?: string | null
  createdAt?: string
  [key: string]: any
}

export type QueueFilter = { id: string; label: string; params: Record<string, string> }
