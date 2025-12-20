import { Redis } from '@gravito/orbit-redis'
import type { SessionId, SessionRecord, SessionStore } from '../types'

export class RedisSessionStore implements SessionStore {
  constructor(
    private prefix: string = 'session:',
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
