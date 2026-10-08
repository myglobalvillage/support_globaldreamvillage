export type Role = 'admin' | 'support_admin' | 'agent'
export type Me = { userId: string; name: string; email: string; role: Role }
export type View = 'queue' | 'team' | 'analytics'

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year'

export type AnalyticsSummary = {
  totalRaised: number
  totalResolved: number
  resolutionRate: number
  slaComplianceRate: number
  avgFirstResponseHours: number | null
  avgResolutionHours: number | null
  avgCsat: number | null
}

export type TrendPoint = {
  label: string
  raised: number
  resolved: number
}

export type AgentPerformance = {
  userId: string
  name: string
  role: string
  handled: number
  resolved: number
  avgFirstResponseHours: number | null
  avgCsat: number | null
}

export type AnalyticsData = {
  period: AnalyticsPeriod
  dateRange: { start: string; end: string }
  summary: AnalyticsSummary
  trend: TrendPoint[]
  byCategory: Record<string, number>
  byChannel: Record<string, number>
  byPriority: Record<string, number>
  byStatus: Record<string, number>
  agentPerformance: AgentPerformance[]
}

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
