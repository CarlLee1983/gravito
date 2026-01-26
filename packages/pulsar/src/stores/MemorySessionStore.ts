import type { SessionId, SessionRecord, SessionStore } from '../types'

/**
 * In-memory session store for development and testing.
 *
 * Stores sessions in a JavaScript Map with automatic expiration checks on read.
 * This is the fastest storage option but data is lost on process restart.
 *
 * **Performance Characteristics:**
 * - ✅ Fastest read/write performance (O(1) Map operations)
 * - ✅ No external dependencies or network latency
 * - ✅ Zero configuration required
 * - ❌ Data lost on process restart or crash
 * - ❌ Not suitable for multi-instance deployments (no session sharing)
 * - ❌ Memory consumption grows with session count
 *
 * **Best For:** Development, unit tests, single-instance prototypes
 *
 * @example
 * ```typescript
 * const store = new MemorySessionStore(() => Date.now())
 * await store.set('session-id', { data: { userId: '123' }, createdAt: Date.now(), lastActivityAt: Date.now() }, 3600)
 * const session = await store.get('session-id')
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class MemorySessionStore implements SessionStore {
  private store = new Map<string, { record: SessionRecord; expiresAt: number }>()
  constructor(private now: () => number) {}

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
