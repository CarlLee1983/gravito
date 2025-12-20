import type { SessionId, SessionRecord, SessionStore } from '../types'

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
