import type { MongoClient } from './MongoClient'

/**
 * MongoDB connection pool metrics
 */
export interface PoolMetrics {
  totalConnections: number
  availableConnections: number
  waitQueueSize: number
  currentCheckedOutCount: number
}

/**
 * MongoDB Pool Monitor
 * Provides metrics about the connection pool
 */
export class MongoPoolMonitor {
  private client: MongoClient

  constructor(client: MongoClient) {
    this.client = client
  }

  /**
   * Get pool metrics
   * Note: Requires mongodb driver 4.0+
   */
  getMetrics(): PoolMetrics | null {
    // biome-ignore lint/suspicious/noExplicitAny: Accessing internal properties for monitoring
    const nativeClient = (this.client as any).client
    if (!nativeClient?.topology) {
      return null
    }

    // Get pool stats from topology
    // biome-ignore lint/suspicious/noExplicitAny: Accessing internal properties for monitoring
    const servers = nativeClient.topology.s.servers
    let total = 0
    let available = 0
    let waitQueue = 0
    let checkedOut = 0

    // biome-ignore lint/suspicious/noExplicitAny: Accessing internal properties for monitoring
    for (const [, server] of servers) {
      const pool = server.pool
      if (pool) {
        total += pool.totalConnectionCount ?? 0
        available += pool.availableConnectionCount ?? 0
        waitQueue += pool.waitQueueSize ?? 0
        checkedOut += pool.currentCheckedOutCount ?? 0
      }
    }

    return {
      totalConnections: total,
      availableConnections: available,
      waitQueueSize: waitQueue,
      currentCheckedOutCount: checkedOut,
    }
  }
}
