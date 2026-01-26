import { Redis } from '@gravito/plasma'
import type { SessionId, SessionRecord, SessionStore } from '../types'

/**
 * Redis-based session store for distributed production deployments.
 *
 * Leverages Redis's native TTL (Time-To-Live) for automatic session expiration,
 * eliminating the need for manual cleanup. Ideal for horizontally scaled applications
 * where multiple server instances need to share session state.
 *
 * **Performance Characteristics:**
 * - ✅ Excellent for multi-instance deployments (shared session state)
 * - ✅ Automatic expiration via Redis TTL (no manual cleanup needed)
 * - ✅ Scales horizontally with Redis cluster/replication
 * - ⚠️  Network latency on each read/write operation
 * - ⚠️  Requires external Redis server setup and maintenance
 * - ✅ High availability with Redis Sentinel/Cluster
 *
 * **Best For:** Production multi-instance setups, high-traffic applications, distributed systems
 *
 * @example
 * ```typescript
 * const store = new RedisSessionStore('session:', 'default')
 * await store.set('session-id', {
 *   data: { userId: '123' },
 *   createdAt: Date.now(),
 *   lastActivityAt: Date.now()
 * }, 3600)
 * const session = await store.get('session-id')
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class RedisSessionStore implements SessionStore {
  constructor(
    private prefix = 'session:',
    private connection?: string
  ) {}

  private get client() {
    return Redis.connection(this.connection)
  }

  private getKey(id: string): string {
    return `${this.prefix}${id}`
  }

  async get(id: SessionId): Promise<SessionRecord | null> {
    const raw = await this.client.get(this.getKey(id))
    if (!raw) {
      return null
    }
    try {
      return JSON.parse(raw) as SessionRecord
    } catch {
      return null
    }
  }

  async set(id: SessionId, record: SessionRecord, ttlSeconds: number): Promise<void> {
    const key = this.getKey(id)
    const value = JSON.stringify(record)
    // Redis SET key value options
    await this.client.set(key, value, { ex: Math.max(1, ttlSeconds) })
  }

  async delete(id: SessionId): Promise<void> {
    await this.client.del(this.getKey(id))
  }
}
