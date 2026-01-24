import type { RippleLogger } from '../logging/Logger'
import { createLogger } from '../logging/Logger'

export type ConnectionEvent =
  | { type: 'connected'; clientId: string; timestamp: Date }
  | {
      type: 'disconnected'
      clientId: string
      timestamp: Date
      code: number
      reason: string
      duration: number
    }
  | { type: 'subscribed'; clientId: string; channel: string; timestamp: Date }
  | { type: 'unsubscribed'; clientId: string; channel: string; timestamp: Date }
  | { type: 'error'; clientId: string; error: string; timestamp: Date }

export interface ConnectionTracker {
  onConnect(clientId: string): void
  onDisconnect(clientId: string, code: number, reason: string): void
  onSubscribe(clientId: string, channel: string): void
  onUnsubscribe(clientId: string, channel: string): void
  onError(clientId: string, error: string): void
  getConnectionDuration(clientId: string): number | null
  getActiveConnections(): number
}

export class DefaultConnectionTracker implements ConnectionTracker {
  private connections = new Map<
    string,
    {
      connectedAt: Date
      subscriptions: Set<string>
    }
  >()

  private logger: RippleLogger

  constructor(logger?: RippleLogger) {
    this.logger = logger ?? createLogger('ConnectionTracker')
  }

  onConnect(clientId: string): void {
    this.connections.set(clientId, {
      connectedAt: new Date(),
      subscriptions: new Set(),
    })

    this.logger.info('Client connected', {
      clientId,
      activeConnections: this.getActiveConnections(),
    })
  }

  onDisconnect(clientId: string, code: number, reason: string): void {
    const connection = this.connections.get(clientId)
    const duration = connection ? Date.now() - connection.connectedAt.getTime() : 0

    this.logger.info('Client disconnected', {
      clientId,
      code: code.toString(),
      reason,
      durationMs: duration,
      subscriptions: connection?.subscriptions.size ?? 0,
    })

    this.connections.delete(clientId)
  }

  onSubscribe(clientId: string, channel: string): void {
    const connection = this.connections.get(clientId)
    connection?.subscriptions.add(channel)

    this.logger.debug('Client subscribed', {
      clientId,
      channel,
    })
  }

  onUnsubscribe(clientId: string, channel: string): void {
    const connection = this.connections.get(clientId)
    connection?.subscriptions.delete(channel)

    this.logger.debug('Client unsubscribed', {
      clientId,
      channel,
    })
  }

  onError(clientId: string, error: string): void {
    this.logger.error('Client error', {
      clientId,
      error,
    })
  }

  getConnectionDuration(clientId: string): number | null {
    const connection = this.connections.get(clientId)
    if (!connection) return null
    return Date.now() - connection.connectedAt.getTime()
  }

  getActiveConnections(): number {
    return this.connections.size
  }
}
