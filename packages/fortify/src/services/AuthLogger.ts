export type AuthEventType =
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'register'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'email_verification_sent'
  | 'email_verified'
  | 'account_locked'
  | 'account_unlocked'

export interface AuthEvent {
  type: AuthEventType
  userId?: number
  email?: string
  ip: string
  userAgent: string
  success: boolean
  metadata?: Record<string, unknown>
}

export interface AuthLogger {
  log(event: AuthEvent): Promise<void>
  getRecentEvents(userId: number, limit?: number): Promise<AuthEvent[]>
  getFailedAttempts(email: string, since: Date): Promise<AuthEvent[]>
}

export class MemoryAuthLogger implements AuthLogger {
  private events: Array<AuthEvent & { timestamp: Date }> = []

  async log(event: AuthEvent): Promise<void> {
    this.events.push({
      ...event,
      timestamp: new Date(),
    })
  }

  async getRecentEvents(userId: number, limit = 10): Promise<AuthEvent[]> {
    return this.events
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  async getFailedAttempts(email: string, since: Date): Promise<AuthEvent[]> {
    return this.events.filter((e) => e.email === email && !e.success && e.timestamp >= since)
  }

  clear(): void {
    this.events = []
  }
}

export class DatabaseAuthLogger implements AuthLogger {
  constructor(private db: any) {}

  async log(event: AuthEvent): Promise<void> {
    await this.db.table('auth_events').insert({
      type: event.type,
      user_id: event.userId,
      email: event.email,
      ip_address: event.ip,
      user_agent: event.userAgent,
      success: event.success,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      created_at: new Date(),
    })
  }

  async getRecentEvents(userId: number, limit = 10): Promise<AuthEvent[]> {
    const rows = await this.db
      .table('auth_events')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)

    return rows.map((row: any) => ({
      type: row.type,
      userId: row.user_id,
      email: row.email,
      ip: row.ip_address,
      userAgent: row.user_agent,
      success: row.success,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }))
  }

  async getFailedAttempts(email: string, since: Date): Promise<AuthEvent[]> {
    const rows = await this.db
      .table('auth_events')
      .where('email', email)
      .where('success', false)
      .where('created_at', '>=', since)
      .orderBy('created_at', 'desc')

    return rows.map((row: any) => ({
      type: row.type,
      userId: row.user_id,
      email: row.email,
      ip: row.ip_address,
      userAgent: row.user_agent,
      success: row.success,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }))
  }
}
