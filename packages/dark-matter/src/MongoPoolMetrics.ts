import type { MongoClient } from './MongoClient'
import type { PoolMetrics } from './types'

/**
 * MongoDB Pool Monitor
 *
 * Provides real-time metrics about the MongoDB connection pool.
 * Useful for monitoring application health and diagnosing connection leaks.
 *
 * @example
 * ```typescript
 * const monitor = new MongoPoolMonitor(client);
 * const metrics = monitor.getMetrics();
 * console.log(`Available connections: ${metrics.availableConnections}`);
 * ```
 */
export class MongoPoolMonitor {
  private client: MongoClient

  /**
   * Creates a new Pool Monitor.
   *
   * @param client - The MongoClient instance to monitor.
   */
  constructor(client: MongoClient) {
    this.client = client
  }

  /**
   * Retrieves current connection pool metrics.
   *
   * Inspects the internal state of the MongoDB driver to gather pool statistics.
   * Note: This relies on internal driver properties and requires mongodb driver 4.0+.
   *
   * @returns A PoolMetrics object containing connection counts, or null if not connected.
   *
   * @example
   * ```typescript
   * const metrics = monitor.getMetrics();
   * if (metrics) {
   *   console.log('Total:', metrics.totalConnections);
   *   console.log('Waiting:', metrics.waitQueueSize);
   * }
   * ```
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
