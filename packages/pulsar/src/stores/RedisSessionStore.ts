import { Redis } from '@gravito/plasma'
import type { SessionId, SessionRecord, SessionStore } from '../types'

/**
 * Redis-based session store for production deployments.
 *
 * Stores sessions in Redis with automatic expiration (TTL).
 * Suitable for multi-instance deployments and high-traffic applications.
 *
 * @example
 * ```typescript
 * const store = new RedisSessionStore('session:', 'default')
 * await store.set('session-id', { userId: '123' }, 3600)
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
