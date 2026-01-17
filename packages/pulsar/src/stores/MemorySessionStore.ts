import type { SessionId, SessionRecord, SessionStore } from '../types'

/**
 * In-memory session store for development and testing.
 *
 * Stores sessions in memory with automatic expiration.
 * Not suitable for production use in multi-instance deployments.
 *
 * @example
 * ```typescript
 * const store = new MemorySessionStore(() => Date.now())
 * await store.set('session-id', { userId: '123' }, 3600)
 * const session = await store.get('session-id')
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class MemorySessionStore implements SessionStore {
  private store = new Map<string, { record: SessionRecord; expiresAt: number }>()
  constructor(private now: () => number) { }

  async get(id: SessionId): Promise<SessionRecord | null> {
    const item = this.store.get(id)
    if (!item) {
      return null
    }
    if (this.now() > item.expiresAt) {
      this.store.delete(id)
      return null
    }
    return item.record
  }

  async set(id: SessionId, record: SessionRecord, ttlSeconds: number): Promise<void> {
    this.store.set(id, { record, expiresAt: this.now() + ttlSeconds * 1000 })
  }

  async delete(id: SessionId): Promise<void> {
    this.store.delete(id)
  }
}
