import type { RippleLogger } from '../logging/Logger'
import { createLogger } from '../logging/Logger'

/**
 * Events tracked by the ConnectionTracker.
 */
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

/**
 * Interface for tracking WebSocket connection lifecycles and statistics.
 *
 * Implementations are responsible for monitoring active connections,
 * subscription states, and providing metrics for observability.
 */
export interface ConnectionTracker {
  /** Called when a client establishes a connection */
  onConnect(clientId: string): void
  /** Called when a client disconnects */
  onDisconnect(clientId: string, code: number, reason: string): void
  /** Called when a client subscribes to a channel */
  onSubscribe(clientId: string, channel: string): void
  /** Called when a client unsubscribes from a channel */
  onUnsubscribe(clientId: string, channel: string): void
  /** Called when a client-related error occurs */
  onError(clientId: string, error: string): void
  /** Get the duration of an active connection in milliseconds */
  getConnectionDuration(clientId: string): number | null
  /** Get the total number of active connections */
  getActiveConnections(): number
}

/**
 * Default implementation of the ConnectionTracker.
 *
 * Maintains an in-memory map of active connections and logs lifecycle events.
 * Provides basic metrics like active connection count and connection duration.
 */
export class DefaultConnectionTracker implements ConnectionTracker {
  /** Map of active connection data: clientId -> connection info */
  private connections = new Map<
    string,
    {
      connectedAt: Date
      subscriptions: Set<string>
    }
  >()

  private logger: RippleLogger

  /**
   * Create a new DefaultConnectionTracker.
   *
   * @param logger - Optional custom logger (defaults to ConsoleLogger)
   */
  constructor(logger?: RippleLogger) {
    this.logger = logger ?? createLogger('ConnectionTracker')
  }

  /**
   * Track a new connection.
   *
   * @param clientId - Unique client identifier
   */
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

  /**
   * Clean up and log disconnection metrics.
   *
   * @param clientId - Client identifier
   * @param code - WebSocket close code
   * @param reason - Close reason
   */
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

  /**
   * Track channel subscription.
   *
   * @param clientId - Client identifier
   * @param channel - Channel name
   */
  onSubscribe(clientId: string, channel: string): void {
    const connection = this.connections.get(clientId)
    connection?.subscriptions.add(channel)

    this.logger.debug('Client subscribed', {
      clientId,
      channel,
    })
  }

  /**
   * Track channel unsubscription.
   *
   * @param clientId - Client identifier
   * @param channel - Channel name
   */
  onUnsubscribe(clientId: string, channel: string): void {
    const connection = this.connections.get(clientId)
    connection?.subscriptions.delete(channel)

    this.logger.debug('Client unsubscribed', {
      clientId,
      channel,
    })
  }

  /**
   * Log client errors.
   *
   * @param clientId - Client identifier
   * @param error - Error message
   */
  onError(clientId: string, error: string): void {
    this.logger.error('Client error', {
      clientId,
      error,
    })
  }

  /**
   * Calculate connection duration.
   *
   * @param clientId - Client identifier
   * @returns Duration in milliseconds, or null if not found
   */
  getConnectionDuration(clientId: string): number | null {
    const connection = this.connections.get(clientId)
    if (!connection) {
      return null
    }
    return Date.now() - connection.connectedAt.getTime()
  }

  /**
   * Get total active connection count.
   */
  getActiveConnections(): number {
    return this.connections.size
  }
}
