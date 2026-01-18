import type { JobPushOptions, SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

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
 * Interface for a compatible Redis Client (ioredis or node-redis)
 */
export interface RedisClient {
    lpush(key: string, ...values: string[]): Promise<number>
    rpop(key: string): Promise<string | null>
    llen(key: string): Promise<number>
    del(key: string): Promise<number>
    lpushx?(key: string, ...values: string[]): Promise<number>
    rpoplpush?(src: string, dst: string): Promise<string | null>
    zadd?(key: string, score: number | string, member: string): Promise<number | string>
    zrange?(key: string, start: number | string, stop: number | string, ...args: string[]): Promise<string[]>
    zrem?(key: string, ...members: string[]): Promise<number>
    get?(key: string): Promise<string | null>
    ltrim?(key: string, start: number, stop: number): Promise<string>
    lrange?(key: string, start: number, stop: number): Promise<string[]>
    set?(key: string, value: string, mode?: string, duration?: number): Promise<string>
    publish?(channel: string, message: string): Promise<number>
    pipeline?(): RedisPipeline
    defineCommand?(name: string, definition: { numberOfKeys: number, lua: string }): void
    [key: string]: unknown

    // Blocking pop
    blpop?(...args: (string | number)[]): Promise<[string, string] | null>

    // Custom commands
    pushGroupJob?(...args: unknown[]): Promise<unknown>
    completeGroupJob?(...args: unknown[]): Promise<unknown>
    popMany?(...args: unknown[]): Promise<unknown>
}

export interface RedisPipeline {
    lpush(key: string, ...values: string[]): RedisPipeline
    ltrim(key: string, start: number, stop: number): RedisPipeline
    exec(): Promise<[error: Error | null, result: unknown][] | null>
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
  private client: RedisClient

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

  // Lua Logic for popMany:
  // Pop up to 'count' items from the queue, checking priorities (Critical -> High -> Default -> Low)
  // Also checks delayed queues.
  // KEYS[1] = prefix
  // KEYS[2] = queueName
  // ARGV[1] = count
  // ARGV[2] = now (timestamp for delayed check)
  private static POP_MANY_SCRIPT = `
    local prefix = KEYS[1]
    local queue = KEYS[2]
    local count = tonumber(ARGV[1])
    local now = tonumber(ARGV[2])
    local result = {}

    local priorities = {'critical', 'high', '', 'low'}

    local function get_key(p)
      if p == '' then return prefix .. queue end
      return prefix .. queue .. ':' .. p
    end

    for _, priority in ipairs(priorities) do
      if #result >= count then break end

      local key = get_key(priority)

      -- 1. Check delayed jobs first
      local delayKey = key .. ':delayed'
      -- ZRANGEBYSCORE delayKey -inf now LIMIT 0 (count - #result)
      local delayed = redis.call('ZRANGEBYSCORE', delayKey, '-inf', now, 'LIMIT', 0, count - #result)

      for _, payload in ipairs(delayed) do
        redis.call('ZREM', delayKey, payload)
        table.insert(result, payload)
      end

      if #result >= count then break end

      -- 2. Check paused status
      local isPaused = redis.call('GET', key .. ':paused')
      if isPaused ~= '1' then
         -- 3. Pop from list
         while #result < count do
            local val = redis.call('RPOP', key)
            if val then
              table.insert(result, val)
            else
              break
            end
         end
      end
    end

    return result
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
    if (typeof this.client.defineCommand === 'function') {
      this.client.defineCommand('pushGroupJob', {
        numberOfKeys: 3,
        lua: RedisDriver.PUSH_SCRIPT,
      })
      this.client.defineCommand('completeGroupJob', {
        numberOfKeys: 3,
        lua: RedisDriver.COMPLETE_SCRIPT,
      })
      this.client.defineCommand('popMany', {
        numberOfKeys: 2,
        lua: RedisDriver.POP_MANY_SCRIPT,
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
      priority: options?.priority
    }
    const payload = JSON.stringify(payloadObj)

    // Handle Group FIFO logic
    if (groupId && typeof this.client.pushGroupJob === 'function') {
      // We use a global active set per queue? No, maybe structure per group?
      // Let's use:
      // activeSet: prefix:active (Set of groupIds)
      // pendingList: prefix:pending:{groupId}

      const activeSetKey = `${this.prefix}active`
      const pendingListKey = `${this.prefix}pending:${groupId}`

      // Using ioredis custom command
      await this.client.pushGroupJob(key, activeSetKey, pendingListKey, groupId, payload)
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

    if (typeof this.client.completeGroupJob === 'function') {
      await this.client.completeGroupJob(key, activeSetKey, pendingListKey, job.groupId)
    }
  }

  /**
   * Pop a job (RPOP, FIFO).
   * Supports implicit priority polling (critical -> high -> default -> low).
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    // Standard priorities to check implicitly
    // undefined = the base queue (default)
    const priorities = ['critical', 'high', undefined, 'low']

    for (const priority of priorities) {
      const key = this.getKey(queue, priority)

      // Check delayed queue first
      const delayKey = `${key}:delayed`
      if (typeof this.client.zrange === 'function') {
        const now = Date.now()
        const delayedJobs = await this.client.zrange(delayKey, 0, 0, 'WITHSCORES')

        if (delayedJobs && delayedJobs.length >= 2) {
          const score = parseFloat(delayedJobs[1]!)
          if (score <= now) {
            const payload = delayedJobs[0]!
            if (this.client.zrem) {
                 await this.client.zrem(delayKey, payload)
            }
            return this.parsePayload(payload)
          }
        }
      }

      // Check if this specific priority queue is paused
      // Logic: Pausing 'default' should probably pause all its priorities?
      // Current logic: Pausing 'default' sets 'queue:default:paused'.
      // But here we are checking 'queue:default:high:paused'.
      // If we want 'default' pause to cascade, we should check base queue pause too.
      // For now, let's keep it simple: Pause applies to the specific list being checked.
      if (typeof this.client.get === 'function') {
        const isPaused = await this.client.get(`${key}:paused`)
        if (isPaused === '1') {
          continue // Skip this priority, try next
        }
      }

      // Pop from queue
      const payload = await this.client.rpop(key)
      if (payload) {
        // Found a job in this priority!
        return this.parsePayload(payload)
      }
    }

    return null
  }

  /**
   * Blocking Pop a job (BLPOP).
   * Supports priority polling via blocking (critical -> high -> default -> low).
   */
  async popBlocking(queue: string, timeout = 0): Promise<SerializedJob | null> {
      // Keys to listen on, in order of priority
      const keys = [
          this.getKey(queue, 'critical'),
          this.getKey(queue, 'high'),
          this.getKey(queue), // default
          this.getKey(queue, 'low')
      ]

      if (typeof this.client.blpop === 'function') {
          // Pass all keys and timeout
          const result = await this.client.blpop(...keys, timeout) as any // ioredis returns [key, value]
          if (result && result.length === 2) {
              const [_, payload] = result
              return this.parsePayload(payload)
          }
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
    if (typeof this.client.del === 'function') { // Check if del is available (it is required by interface but good to be safe)
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
    const hasPriority = jobs.some((j) => j.priority)

    if (hasGroup || hasPriority) {
      for (const job of jobs) {
        await this.push(queue, job, {
          groupId: job.groupId,
          priority: job.priority,
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
        priority: job.priority,
      })
    )

    await this.client.lpush(key, ...payloads)
  }

  /**
   * Pop multiple jobs.
   */
  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    const key = this.getKey(queue)

    // Optimization: Use Lua script or Pipeline to reduce RTT
    if (typeof this.client.popMany === 'function') {
        const results = (await this.client.popMany(this.prefix, queue, count, Date.now())) as string[]
        return results.map(p => this.parsePayload(p))
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
  async reportHeartbeat(workerInfo: unknown, prefix?: string): Promise<void> {
    const key = `${prefix ?? this.prefix}worker:${(workerInfo as any).id}`
    // Support ioredis/node-redis style SET with EX
    if (typeof this.client.set === 'function') {
      await this.client.set(key, JSON.stringify(workerInfo), 'EX', 10)
    }
  }

  /**
   * Publish a log message for monitoring.
   */
  async publishLog(logPayload: unknown, prefix?: string): Promise<void> {
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

    const client = this.client as any
    if (typeof client.incr === 'function') {
      const current = await client.incr(windowKey)
      if (current === 1) {
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
    if (this.client.lrange) {
        const payloads = await this.client.lrange(key, start, end)
        return payloads.map((p: string) => this.parsePayload(p))
    }
    return []
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
