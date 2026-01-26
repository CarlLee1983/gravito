import { Redis } from 'ioredis'
import type { PulseNode } from '../../shared/types'

/**
 * PulseService manages the discovery and health monitoring of system nodes.
 *
 * This service acts as the heartbeat of the distributed system, scanning Redis
 * for ephemeral keys emitted by active Quasar agents. It aggregates these
 * signals to provide a real-time view of the cluster topology, grouping nodes
 * by their service roles.
 *
 * It is essential for:
 * - Visualizing cluster health and scale.
 * - Detecting silent node failures via heartbeat expiry.
 * - Providing metadata for alerting systems.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const pulse = new PulseService('redis://localhost:6379');
 * await pulse.connect();
 * const nodes = await pulse.getNodes();
 * ```
 */
export class PulseService {
  private redis: Redis
  private prefix = 'gravito:quasar:node:'

  /**
   * Creates a new instance of PulseService.
   *
   * @param redisUrl - Connection string for the Redis instance used for coordination.
   */
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
    })
  }

  /**
   * Establishes the connection to Redis.
   *
   * Must be called before any other operations.
   *
   * @returns Promise that resolves when connected.
   * @throws {Error} If connection fails.
   */
  async connect() {
    await this.redis.connect()
  }

  /**
   * Discovers active Pulse nodes across the cluster.
   *
   * Uses Redis SCAN to find all keys matching the heartbeat pattern.
   * Nodes are grouped by service name to facilitate dashboard rendering.
   * Stale nodes (older than 60s) are filtered out to ensure data freshness.
   *
   * @returns A map of service names to their active node instances.
   * @throws {Error} If Redis operations fail.
   *
   * @example
   * ```typescript
   * const map = await pulse.getNodes();
   * console.log(map['worker-service']); // Array of worker nodes
   * ```
   */
  async getNodes(): Promise<Record<string, PulseNode[]>> {
    const nodes: PulseNode[] = []
    let cursor = '0'
    const now = Date.now()

    do {
      // Scan for pulse keys
      const result = await this.redis.scan(cursor, 'MATCH', `${this.prefix}*`, 'COUNT', 100)
      cursor = result[0]
      const keys = result[1]

      if (keys.length > 0) {
        // Fetch values
        const values = await this.redis.mget(...keys)

        values.forEach((v) => {
          if (v) {
            try {
              const node = JSON.parse(v) as PulseNode
              // Filter out stale nodes if TTL didn't catch them yet (grace period 60s)
              if (now - node.timestamp < 60000) {
                nodes.push(node)
              }
            } catch (_e) {
              // Ignore malformed
            }
          }
        })
      }
    } while (cursor !== '0')

    // Group by service
    const grouped: Record<string, PulseNode[]> = {}

    // Sort nodes by service name, then by node id for stable UI positions
    nodes.sort((a, b) => {
      const sComp = a.service.localeCompare(b.service)
      if (sComp !== 0) {
        return sComp
      }
      return a.id.localeCompare(b.id)
    })

    for (const node of nodes) {
      if (!grouped[node.service]) {
        grouped[node.service] = []
      }
      grouped[node.service].push(node)
    }

    return grouped
  }

  /**
   * Manually records a heartbeat for the current process.
   *
   * This is typically used when Zenith itself needs to appear in the node list.
   * The heartbeat is stored with a short TTL (30s) to ensure auto-removal
   * upon crash or shutdown.
   *
   * @param node - The node metadata to broadcast.
   * @returns Promise resolving when the heartbeat is saved.
   * @throws {Error} If Redis write fails.
   *
   * @example
   * ```typescript
   * await pulse.recordHeartbeat({
   *   id: 'zenith-1',
   *   service: 'dashboard',
   *   // ...other props
   * });
   * ```
   */
  async recordHeartbeat(node: PulseNode): Promise<void> {
    const key = `${this.prefix}${node.service}:${node.id}`
    // TTL 30 seconds
    await this.redis.set(key, JSON.stringify(node), 'EX', 30)
  }
}
