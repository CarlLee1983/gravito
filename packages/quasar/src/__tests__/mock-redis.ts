/**
 * A minimal in-memory Redis mock for testing Quasar probes.
 * Supports basic List, Set, Sorted Set operations and Pipelining.
 */
export class MockRedis {
  private data = new Map<string, any[] | Set<any>>()

  // Helper to get raw data container (auto-create if needed)
  private getContainer(key: string, type: 'list' | 'set' | 'zset'): any {
    if (!this.data.has(key)) {
      if (type === 'list') {
        this.data.set(key, [])
      } else if (type === 'set') {
        this.data.set(key, new Set())
      } else if (type === 'zset') {
        this.data.set(key, []) // ZSet modeled as array for simplicity
      }
    }
    return this.data.get(key)
  }

  // --- Keys ---
  async keys(pattern: string): Promise<string[]> {
    // Simple prefix matching for tests (e.g. "bull:queue:*")
    // Converts glob "*" to regex ".*"
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

  async quit(): Promise<void> {
    // No-op
  }

  // --- Pub/Sub ---
  async publish(_channel: string, _message: string): Promise<number> {
    // Mock implementation: just return 1 subscriber received it
    return 1
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

  async llen(key: string): Promise<number> {
    const val = this.data.get(key)
    if (!val || !Array.isArray(val)) {
      return 0
    }
    return val.length
  }

  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    const list = this.data.get(key) as any[]
    if (!list || !Array.isArray(list)) {
      return []
    }
    // Redis LRANGE is inclusive on both ends
    const end = stop === -1 ? undefined : stop + 1
    return list.slice(start, end)
  }

  async lrem(key: string, count: number, element: string): Promise<number> {
    const list = this.data.get(key) as any[]
    if (!list || !Array.isArray(list)) {
      return 0
    }

    let removed = 0
    // Simple implementation: remove all occurrences for test purposes if count != 0
    // Real Redis logic is more complex with count > 0, < 0, = 0
    const _originalLength = list.length
    const filtered = list.filter((item) => {
      // If element matches, we might remove it
      if (item === element) {
        // Count = 0 means remove all
        if (count === 0) {
          removed++
          return false
        }
        // Count > 0 logic omitted for brevity, assuming simple tests
        removed++
        return false
      }
      return true
    })

    this.data.set(key, filtered)
    return removed
  }

  // --- Sets ---
  async sadd(key: string, ...members: any[]): Promise<number> {
    const set = this.getContainer(key, 'set') as Set<any>
    let added = 0
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m)
        added++
      }
    }
    return added
  }

  async scard(key: string): Promise<number> {
    const val = this.data.get(key)
    if (val instanceof Set) {
      return val.size
    }
    return 0
  }

  // --- Sorted Sets ---
  async zadd(key: string, score: number, member: string): Promise<number> {
    const zset = this.getContainer(key, 'zset') as any[]
    // Simple mock: just push, we don't strictly maintain order for cardinality tests
    zset.push({ member, score })
    return 1
  }

  async zcard(key: string): Promise<number> {
    const val = this.data.get(key)
    if (!val || !Array.isArray(val)) {
      return 0
    }
    return val.length
  }

  async zrange(key: string, _min: number, _max: number): Promise<any[]> {
    // Mock return members
    const val = (this.data.get(key) as any[]) || []
    return val.map((v) => v.member)
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    const list = (this.data.get(key) as any[]) || []
    const originalLen = list.length
    const filtered = list.filter((item) => !members.includes(item.member))
    this.data.set(key, filtered)
    return originalLen - filtered.length
  }

  // --- Pipeline ---
  pipeline() {
    const commands: (() => Promise<any>)[] = []

    // Proxy handler to capture all method calls
    const proxy = new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'exec') {
          return async () => {
            const results = []
            for (const cmd of commands) {
              try {
                const res = await cmd()
                results.push([null, res])
              } catch (e) {
                results.push([e, null])
              }
            }
            return results
          }
        }

        // Return a function that queues the command
        return (...args: any[]) => {
          // @ts-expect-error
          if (typeof target[prop] === 'function') {
            commands.push(async () => {
              // @ts-expect-error
              return target[prop].apply(target, args)
            })
          }
          return proxy // Return proxy for chaining
        }
      },
    })

    return proxy
  }

  // --- Multi (Transaction) ---
  multi() {
    // For our tests, multi can behave like pipeline (mocking atomic not required for Probe tests)
    return this.pipeline()
  }
}
