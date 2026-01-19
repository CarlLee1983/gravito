import type { JobPushOptions, SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Interface for Redis clients (compatible with ioredis and node-redis).
 */
export interface RedisClient {
  lpush(key: string, ...values: string[]): Promise<number>
  rpop(key: string): Promise<string | null>
  llen(key: string): Promise<number>
  del(key: string, ...keys: string[]): Promise<number>
  lpushx?(key: string, ...values: string[]): Promise<number>
  rpoplpush?(src: string, dst: string): Promise<string | null>
  zadd?(key: string, score: number, member: string): Promise<number>
  zrange?(key: string, start: number, end: number, ...args: string[]): Promise<string[]>
  zrem?(key: string, ...members: string[]): Promise<number>
  get?(key: string): Promise<string | null>
  set?(key: string, value: string, ...args: any[]): Promise<'OK' | null>
  ltrim?(key: string, start: number, stop: number): Promise<'OK'>
  lrange?(key: string, start: number, stop: number): Promise<string[]>
  publish?(channel: string, message: string): Promise<number>
  pipeline?(): any
  defineCommand?(name: string, options: { numberOfKeys: number; lua: string }): void
  incr?(key: string): Promise<number>
  expire?(key: string, seconds: number): Promise<number>
  [key: string]: any
}

/**
 * Redis driver configuration.
 */
export interface RedisDriverConfig {
  /**
   * Redis client instance (ioredis or node-redis).
   */
  client: RedisClient

  /**
   * Key prefix (default: `queue:`).
   */
  prefix?: string
}

/**
 * Redis Driver
 *
 * Uses Redis as the queue backend.
 * Implements FIFO via Redis Lists (LPUSH/RPOP).
 *
 * Requires `ioredis` or `redis`.
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis'
 *
 * const redis = new Redis('redis://localhost:6379')
 * const redis = new Redis('ioredis://localhost:6379')
 * const driver = new RedisDriver({ client: redis })
 *
 * await driver.push('default', serializedJob)
 * ```
 */
export class RedisDriver implements QueueDriver {
  private prefix: string
  private client: RedisDriverConfig['client']

  // Lua Logic:
  // IF (IS_MEMBER(activeSet, groupId)) -> PUSH(pendingList, job)
  // ELSE -> SADD(activeSet, groupId) & LPUSH(waitList, job)
  private static PUSH_SCRIPT = `
    local waitList = KEYS[1]
    local activeSet = KEYS[2]
    local pendingList = KEYS[3]
    local groupId = ARGV[1]
    local payload = ARGV[2]
    
    if redis.call('SISMEMBER', activeSet, groupId) == 1 then
      return redis.call('RPUSH', pendingList, payload)
    else
      redis.call('SADD', activeSet, groupId)
      return redis.call('LPUSH', waitList, payload)
    end
  `

  // Lua Logic:
  // local next = LPOP(pendingList)
  // IF (next) -> LPUSH(waitList, next)
  // ELSE -> SREM(activeSet, groupId)
  private static COMPLETE_SCRIPT = `
    local waitList = KEYS[1]
    local activeSet = KEYS[2]
    local pendingList = KEYS[3]
    local groupId = ARGV[1]

    local nextJob = redis.call('LPOP', pendingList)
    if nextJob then
      return redis.call('LPUSH', waitList, nextJob)
    else
      return redis.call('SREM', activeSet, groupId)
    end
  `

  constructor(config: RedisDriverConfig) {
    this.client = config.client
    this.prefix = config.prefix ?? 'queue:'

    if (!this.client) {
      throw new Error(
        '[RedisDriver] Redis client is required. Please install ioredis or redis package.'
      )
    }

    // Register Lua scripts if defineCommand is available (ioredis)
    // Register Lua scripts if defineCommand is available (ioredis)
    if (typeof this.client.defineCommand === 'function') {
      this.client.defineCommand('pushGroupJob', {
        numberOfKeys: 3,
        lua: RedisDriver.PUSH_SCRIPT,
      })
      this.client.defineCommand('completeGroupJob', {
        numberOfKeys: 3,
        lua: RedisDriver.COMPLETE_SCRIPT,
      })
    }
  }

  /**
   * Get full Redis key for a queue.
   */
  private getKey(queue: string, priority?: string | number): string {
    if (priority) {
      return `${this.prefix}${queue}:${priority}`
    }
    return `${this.prefix}${queue}`
  }

  /**
   * Push a job (LPUSH).
   */
  async push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void> {
    const key = this.getKey(queue, options?.priority)
    // Add groupId to payload if provided in options
    const groupId = options?.groupId

    // Warning: Group FIFO logic doesn't currently support Priority Queues combined.
    // If priority is used, we assume it's just a different list.
    if (groupId && options?.priority) {
      // For now, prioritize Priority over Group if both present?
      // Actually, if we use separate lists for priority, the Group SISMEMBER logic fails
      // because it checks a global active set but the job goes to a priority-specific pending list?
      // Complicated. Let's assume standard usage for now.
    }

    const payloadObj = {
      id: job.id,
      type: job.type,
      data: job.data,
      className: job.className,
      createdAt: job.createdAt,
      delaySeconds: job.delaySeconds,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      groupId: groupId,
      error: job.error,
      failedAt: job.failedAt,
    }
    const payload = JSON.stringify(payloadObj)

    // Handle Group FIFO logic
    if (groupId && typeof (this.client as any).pushGroupJob === 'function') {
      // We use a global active set per queue? No, maybe structure per group?
      // Let's use:
      // activeSet: prefix:active (Set of groupIds)
      // pendingList: prefix:pending:{groupId}

      const activeSetKey = `${this.prefix}active`
      const pendingListKey = `${this.prefix}pending:${groupId}`

      // Using ioredis custom command
      await (this.client as any).pushGroupJob(key, activeSetKey, pendingListKey, groupId, payload)
      return
    }

    // For delayed jobs, prefer Sorted Sets (ZADD) when supported
    if (job.delaySeconds && job.delaySeconds > 0) {
      const delayKey = `${key}:delayed`
      const score = Date.now() + job.delaySeconds * 1000
      // Store delayed job in ZSET
      if (typeof this.client.zadd === 'function') {
        await this.client.zadd(delayKey, score, payload)
      } else {
        // Fallback: push directly (no delay support)
        await this.client.lpush(key, payload)
      }
    } else {
      await this.client.lpush(key, payload)
    }
  }

  /**
   * Complete a job (handle Group FIFO).
   */
  async complete(queue: string, job: SerializedJob): Promise<void> {
    if (!job.groupId) {
      return // Not a grouped job
    }

    // Determine key based on job data? Or just use base queue?
    // Theoretically if job was in priority queue, its key was different.
    // However, complete() relies on internal knowledge.
    const key = this.getKey(queue)
    const activeSetKey = `${this.prefix}active`
    const pendingListKey = `${this.prefix}pending:${job.groupId}`

    if (typeof (this.client as any).completeGroupJob === 'function') {
      await (this.client as any).completeGroupJob(key, activeSetKey, pendingListKey, job.groupId)
    }
  }

  /**
   * Pop a job from a queue (non-blocking).
   * Optimized with Lua script for atomic priority polling.
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const priorities = ['critical', 'high', 'default', 'low']
    const keys: string[] = []

    for (const p of priorities) {
      keys.push(this.getKey(queue, p === 'default' ? undefined : p))
    }

    const script = `
      local now = tonumber(ARGV[1])
      for i, key in ipairs(KEYS) do
        -- 1. Check delayed
        local delayKey = key .. ":delayed"
        local delayed = redis.call("ZRANGEBYSCORE", delayKey, 0, now, "LIMIT", 0, 1)
        if delayed[1] then
          redis.call("ZREM", delayKey, delayed[1])
          return {key, delayed[1]}
        end

        -- 2. Check paused
        local isPaused = redis.call("GET", key .. ":paused")
        if isPaused ~= "1" then
          -- 3. RPOP
          local payload = redis.call("RPOP", key)
          if payload then
            return {key, payload}
          end
        end
      end
      return nil
    `

    try {
      // Use eval or registered script if available
      const result = await (this.client as any).eval(
        script,
        keys.length,
        ...keys,
        Date.now().toString()
      )

      if (result?.[1]) {
        return this.parsePayload(result[1])
      }
    } catch (err) {
      console.error('[RedisDriver] Lua pop error:', err)
      // Fallback to manual loop if script fails
      return this.popManualFallback(queue)
    }

    return null
  }

  /**
   * Manual fallback for pop if Lua fails.
   */
  private async popManualFallback(queue: string): Promise<SerializedJob | null> {
    const priorities = ['critical', 'high', undefined, 'low']
    for (const priority of priorities) {
      const key = this.getKey(queue, priority)
      const delayKey = `${key}:delayed`

      const now = Date.now()
      const delayedJobs = await this.client.zrange?.(delayKey, 0, 0, 'WITHSCORES')
      if (delayedJobs && delayedJobs.length >= 2) {
        const score = parseFloat(delayedJobs[1]!)
        if (score <= now) {
          const payload = delayedJobs[0]!
          await this.client.zrem?.(delayKey, payload)
          return this.parsePayload(payload)
        }
      }

      const isPaused = await this.client.get?.(`${key}:paused`)
      if (isPaused === '1') continue

      const payload = await this.client.rpop(key)
      if (payload) return this.parsePayload(payload)
    }
    return null
  }

  /**
   * Pop a job from the queue (blocking).
   * Uses BRPOP for efficiency. Supports multiple queues and priorities.
   */
  async popBlocking(queues: string | string[], timeout: number): Promise<SerializedJob | null> {
    const queueList = Array.isArray(queues) ? queues : [queues]
    const priorities = ['critical', 'high', undefined, 'low']
    const keys: string[] = []

    for (const q of queueList) {
      for (const p of priorities) {
        keys.push(this.getKey(q, p))
      }
    }

    if (typeof this.client.brpop !== 'function') {
      // Fallback: pop from first queue if multiple
      return this.pop(queueList[0]!)
    }

    try {
      // ioredis/node-redis brpop returns [key, value]
      const result = await this.client.brpop(...keys, timeout)
      if (result && Array.isArray(result) && result.length >= 2) {
        return this.parsePayload(result[1])
      }
    } catch (_e) {
      // Timeout or error
    }

    return null
  }

  /**
   * Parse Redis payload.
   */
  private parsePayload(payload: string): SerializedJob {
    const parsed = JSON.parse(payload)
    return {
      id: parsed.id,
      type: parsed.type,
      data: parsed.data,
      className: parsed.className,
      createdAt: parsed.createdAt,
      delaySeconds: parsed.delaySeconds,
      attempts: parsed.attempts,
      maxAttempts: parsed.maxAttempts,
      groupId: parsed.groupId,
      error: parsed.error,
      failedAt: parsed.failedAt,
      priority: parsed.priority,
    }
  }

  /**
   * Get queue size.
   */
  async size(queue: string): Promise<number> {
    const key = this.getKey(queue)
    return this.client.llen(key)
  }

  /**
   * Mark a job as permanently failed (DLQ).
   */
  async fail(queue: string, job: SerializedJob): Promise<void> {
    const key = `${this.getKey(queue)}:failed`
    const payload = JSON.stringify({
      ...job,
      failedAt: Date.now(),
    })
    await this.client.lpush(key, payload)

    // Optional: Keep DLQ capped at 1000 items to avoid bloat
    if (typeof this.client.ltrim === 'function') {
      await this.client.ltrim(key, 0, 999)
    }
  }

  /**
   * Clear a queue.
   */
  async clear(queue: string): Promise<void> {
    const key = this.getKey(queue)
    const delayKey = `${key}:delayed`
    const activeSetKey = `${this.prefix}active`

    await this.client.del(key)
    if (this.client.del) {
      await this.client.del(delayKey)
      // Also clear active set?
      // Ideally we should scan and clear all pending lists too but that's expensive.
      // For now just clear the active Set.
      await this.client.del(activeSetKey)
    }
  }

  /**
   * Push multiple jobs.
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    // If any job has groupId, we must fall back to one-by-one to respect Lua logic
    // If any job has priority, we must fall back to one-by-one to respect strict separate-list routing
    const hasGroup = jobs.some((j) => j.groupId)
    const hasPriority = jobs.some((j) => (j as any).priority) // SerializedJob needs priority type update too

    if (hasGroup || hasPriority) {
      for (const job of jobs) {
        await this.push(queue, job, {
          groupId: job.groupId,
          priority: (job as any).priority,
        })
      }
      return
    }

    const key = this.getKey(queue)
    const payloads = jobs.map((job) =>
      JSON.stringify({
        id: job.id,
        type: job.type,
        data: job.data,
        className: job.className,
        createdAt: job.createdAt,
        delaySeconds: job.delaySeconds,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        groupId: job.groupId,
        priority: (job as any).priority,
      })
    )

    await this.client.lpush(key, ...payloads)
  }

  /**
   * Pop multiple jobs.
   * Atomic operation across multiple priority levels.
   */
  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    if (count <= 0) return []
    if (count === 1) {
      const job = await this.pop(queue)
      return job ? [job] : []
    }

    // For better performance and atomicity across priorities, we should use a Lua script.
    // However, to keep it simple and compatible for now, let's at least use Pipeline or RPOP count if available.
    // If priority polling is needed, we do it in a loop but we can optimize the base case.

    const key = this.getKey(queue)

    // Check if RPOP with count is supported (Redis 6.2+)
    // We try to call it and fallback if it fails or returns unexpected type
    try {
      const payloads = await (this.client as any).rpop(key, count)
      if (Array.isArray(payloads)) {
        return payloads.map((p) => this.parsePayload(p))
      } else if (payloads) {
        return [this.parsePayload(payloads)]
      }
    } catch (_e) {
      // Fallback to loop if RPOP count is not supported
    }

    const results: SerializedJob[] = []
    for (let i = 0; i < count; i++) {
      const payload = await this.client.rpop(key)
      if (payload) {
        results.push(this.parsePayload(payload))
      } else {
        break
      }
    }

    return results
  }

  /**
   * Report worker heartbeat for monitoring.
   */
  async reportHeartbeat(workerInfo: any, prefix?: string): Promise<void> {
    const key = `${prefix ?? this.prefix}worker:${workerInfo.id}`
    // Support ioredis/node-redis style SET with EX
    if (typeof this.client.set === 'function') {
      await this.client.set(key, JSON.stringify(workerInfo), 'EX', 10)
    }
  }

  /**
   * Publish a log message for monitoring.
   */
  async publishLog(logPayload: any, prefix?: string): Promise<void> {
    const payload = JSON.stringify(logPayload)
    const monitorPrefix = prefix ?? this.prefix

    // 1. PubSub
    if (typeof this.client.publish === 'function') {
      await this.client.publish(`${monitorPrefix}logs`, payload)
    }

    // 2. History (Capped List)
    const historyKey = `${monitorPrefix}logs:history`
    if (typeof this.client.pipeline === 'function') {
      const pipe = this.client.pipeline()
      pipe.lpush(historyKey, payload)
      pipe.ltrim(historyKey, 0, 99)
      await pipe.exec()
    } else {
      await this.client.lpush(historyKey, payload)
    }
  }

  /**
   * Check if a queue is rate limited.
   * Uses a fixed window counter.
   */
  async checkRateLimit(queue: string, config: { max: number; duration: number }): Promise<boolean> {
    const key = `${this.prefix}${queue}:ratelimit`
    const now = Date.now()
    const windowStart = Math.floor(now / config.duration)

    // Using a Lua script for atomicity would be better, but simple INCR+EXPIRE is okay for soft limits
    // Key format: queue:ratelimit:{windowStart}
    const windowKey = `${key}:${windowStart}`

    const client = this.client
    if (typeof client.incr === 'function') {
      const current = await client.incr(windowKey)
      if (current === 1 && client.expire) {
        // Set expiry for slightly more than duration to handle clock drift
        await client.expire(windowKey, Math.ceil(config.duration / 1000) + 1)
      }
      return current <= config.max
    }

    return true // Fallback if INCR not supported
  }

  /**
   * Get failed jobs from DLQ.
   */
  async getFailed(queue: string, start = 0, end = -1): Promise<SerializedJob[]> {
    const key = `${this.getKey(queue)}:failed`
    if (typeof this.client.lrange !== 'function') return []
    const payloads = await this.client.lrange(key, start, end)
    return payloads.map((p: string) => this.parsePayload(p))
  }

  /**
   * Retry failed jobs from DLQ.
   * Moves jobs from failed list back to the main queue.
   */
  async retryFailed(queue: string, count = 1): Promise<number> {
    const failedKey = `${this.getKey(queue)}:failed`
    let retried = 0

    for (let i = 0; i < count; i++) {
      // RPOPLPUSH source destination
      // We pop from the RIGHT (assuming failures are pushed to LEFT, so oldest are on RIGHT)
      if (typeof this.client.rpop !== 'function') break
      const payload = await this.client.rpop(failedKey)
      if (!payload) {
        break
      }

      // We should ideally update attempts/error fields before pushing back.
      // But standard RPOPLPUSH doesn't allow modification.
      // So we RPOP, Modify, LPUSH.
      // Limitation: Not atomic if process crashes in between.
      // But acceptable for this "Manual Retry" operation.

      const job: SerializedJob = this.parsePayload(payload)

      // Reset attempts and error
      job.attempts = 0
      delete job.error
      delete job.failedAt

      await this.push(queue, job, { priority: job.priority, groupId: job.groupId })
      retried++
    }

    return retried
  }

  /**
   * Clear failed jobs from DLQ.
   */
  async clearFailed(queue: string): Promise<void> {
    const key = `${this.getKey(queue)}:failed`
    await this.client.del(key)
  }
}
