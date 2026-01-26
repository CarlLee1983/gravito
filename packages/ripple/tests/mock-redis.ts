/**
 * A minimal in-memory Redis mock for testing Ripple drivers.
 * Supports basic Pub/Sub and Key operations.
 */
export class MockRedis {
  private data = new Map<string, any>()

  public status = 'ready'

  // Helper to get raw data container
  private getContainer(key: string, type: 'list' | 'set' | 'zset'): any {
    if (!this.data.has(key)) {
      if (type === 'list') {
        this.data.set(key, [])
      } else if (type === 'set') {
        this.data.set(key, new Set())
      } else if (type === 'zset') {
        this.data.set(key, [])
      }
    }
    return this.data.get(key)
  }

  // --- Connection ---
  async connect(): Promise<void> {
    this.status = 'ready'
  }

  async quit(): Promise<void> {
    this.status = 'end'
  }

  async disconnect(): Promise<void> {
    this.status = 'end'
  }

  on(_event: string, _handler: Function): void {
    // Stub
  }

  // --- Pub/Sub ---
  async subscribe(...channels: string[]): Promise<number> {
    return channels.length
  }

  async psubscribe(...patterns: string[]): Promise<number> {
    return patterns.length
  }

  async unsubscribe(...channels: string[]): Promise<number> {
    return channels.length
  }

  async punsubscribe(...patterns: string[]): Promise<number> {
    return patterns.length
  }

  async publish(_channel: string, _message: string): Promise<number> {
    // In a real mock we would trigger handlers, but for unit tests
    // verifying that publish is CALLED is usually enough.
    // If we need to test reception, we can manually trigger the callback exposed by the mock.
    return 1
  }

  // --- Keys ---
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`)
    return Array.from(this.data.keys()).filter((k) => regex.test(k))
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0
    for (const key of keys) {
      if (this.data.delete(key)) {
        count++
      }
    }
    return count
  }

  // --- Strings ---
  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null
  }

  async set(key: string, value: string): Promise<string> {
    this.data.set(key, value)
    return 'OK'
  }

  // --- Lists ---
  async lpush(key: string, ...values: any[]): Promise<number> {
    const list = this.getContainer(key, 'list') as any[]
    list.unshift(...values)
    return list.length
  }

  async rpush(key: string, ...values: any[]): Promise<number> {
    const list = this.getContainer(key, 'list') as any[]
    list.push(...values)
    return list.length
  }

  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    const list = this.data.get(key) as any[]
    if (!list || !Array.isArray(list)) {
      return []
    }
    const end = stop === -1 ? undefined : stop + 1
    return list.slice(start, end)
  }

  // --- Pipeline ---
  pipeline() {
    return {
      exec: async () => [],
    }
  }
}
