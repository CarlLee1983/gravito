import { StreamError, StreamErrorCodes } from '../errors'
import type { JobPushOptions, QueueStats, SerializedJob } from '../types'
import { decodeBinaryJobFrame, encodeBinaryJobFrame, isGravitoJobFrame } from './BinaryJobFrame'
import { prepareJobForTransport } from './prepareJobForTransport'
import type { QueueDriver } from './QueueDriver'

/**
 * Interface for Redis clients (compatible with ioredis and node-redis).
 */
export interface RedisClient {
  lpush(key: string, ...values: string[]): Promise<number>
  rpop(key: string, count?: number): Promise<string | string[] | null>
  brpop?(...args: Array<string | number>): Promise<[string, string] | null>
  llen(key: string): Promise<number>
  del(key: string, ...keys: string[]): Promise<number>
  lpushx?(key: string, ...values: string[]): Promise<number>
  rpoplpush?(src: string, dst: string): Promise<string | null>
  zadd?(key: string, score: number, member: string): Promise<number>
  zcard?(key: string): Promise<number>
  zrange?(key: string, start: number, end: number, ...args: string[]): Promise<string[]>
  zrangebyscore?(key: string, min: string | number, max: string | number): Promise<string[]>
  zrem?(key: string, ...members: string[]): Promise<number>
  get?(key: string): Promise<string | null>
  hgetall?(key: string): Promise<Record<string, string>>
  set?(key: string, value: string, ...args: Array<string | number>): Promise<'OK' | null>
  ltrim?(key: string, start: number, stop: number): Promise<'OK'>
  lrange?(key: string, start: number, stop: number): Promise<string[]>
  publish?(channel: string, message: string): Promise<number>
  pipeline?(): RedisPipeline
  defineCommand?(name: string, options: { numberOfKeys: number; lua: string }): void
  incr?(key: string): Promise<number>
  expire?(key: string, seconds: number): Promise<number>
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>
  subscribe?(...channels: string[]): Promise<unknown>
  on?(
    event: 'message',
    handler: (channel: string, message: string) => void | Promise<void>
  ): unknown
  on?(event: string, handler: (...args: unknown[]) => void): unknown

  /**
   * Binary-capable RPOP（ioredis Buffer mode）
   * 回傳 Buffer 而非 string，支援 binary frame 的零拷貝讀取
   */
  rpopBuffer?(key: string, count?: number): Promise<Buffer | Buffer[] | null>

  /**
   * Binary-capable BRPOP（ioredis Buffer mode）
   * 支援 blocking pop 的 binary frame 讀取
   */
  brpopBuffer?(...args: Array<string | number>): Promise<[Buffer, Buffer] | null>

  /**
   * Binary-capable LRANGE（ioredis Buffer mode）
   * 用於從 DLQ 讀取 binary frame
   */
  lrangeBuffer?(key: string, start: number, stop: number): Promise<Buffer[]>

  /**
   * Binary-capable LPUSH（接受 Buffer）
   * 用於將 binary frame 寫入 Redis list
   */
  lpushBuffer?(key: string, ...values: Buffer[]): Promise<number>

  [key: string]: unknown
}

interface BinaryTransportPayload {
  isBinary: true
  buffer: Buffer
}

interface JsonTransportPayload {
  isBinary: false
  payload: string
}

type RedisTransportPayload = BinaryTransportPayload | JsonTransportPayload

interface PipelineReply<T = unknown> {
  0: Error | null
  1: T
}

interface RedisPipeline {
  llen(key: string): RedisPipeline
  zcard(key: string): RedisPipeline
  lpush(key: string, ...values: string[]): RedisPipeline
  ltrim(key: string, start: number, stop: number): RedisPipeline
  rpop(key: string): RedisPipeline
  del(key: string, ...keys: string[]): RedisPipeline
  hset(key: string, values: Record<string, string | number | boolean>): RedisPipeline
  zadd(key: string, score: number, member: string): RedisPipeline
  zrem(key: string, ...members: string[]): RedisPipeline
  pushGroupJob?(
    waitList: string,
    activeSet: string,
    pendingList: string,
    groupId: string,
    payload: string
  ): RedisPipeline
  lpushBuffer?(key: string, ...values: Buffer[]): RedisPipeline
  exec(): Promise<PipelineReply[] | null>
}

function isRedisEvalPopResult(value: unknown): value is [string, string | Buffer] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'string' &&
    (typeof value[1] === 'string' || Buffer.isBuffer(value[1]))
  )
}

interface WorkerHeartbeatPayload {
  id: string
  [key: string]: unknown
}

interface LogPayload {
  [key: string]: unknown
}

/**
 * Extended Redis client with custom commands.
 */
export interface CustomRedisClient extends RedisClient {
  pushGroupJob(
    waitList: string,
    activeSet: string,
    pendingList: string,
    groupId: string,
    payload: string
  ): Promise<number>
  completeGroupJob(
    waitList: string,
    activeSet: string,
    pendingList: string,
    groupId: string
  ): Promise<number>
  popMany(queue: string, prefix: string, count: number, now: string): Promise<string[]>
}

/**
 * Extended Redis client with custom group commands (Legacy name).
 */
export type GroupRedisClient = CustomRedisClient

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
 * High-performance Redis queue driver.
 *
 * Implements FIFO queues using Redis Lists, reliable priority support, delayed jobs via Sorted Sets,
 * and rate limiting. Uses Lua scripts for atomic operations and advanced features like
 * group-based sequential processing.
 *
 * 支援 binary frame 格式：
 * - push/pushMany：type === 'binary' 且 data instanceof Uint8Array 時，使用 BinaryJobFrame 格式
 * - pop/popMany：透過 magic byte 嗅探自動偵測格式（binary frame 或 JSON）
 *
 * @public
 * @example
 * ```typescript
 * import Redis from 'ioredis';
 * const redis = new Redis();
 * const driver = new RedisDriver({ client: redis });
 * ```
 */
export class RedisDriver implements QueueDriver {
  private prefix: string
  private client: CustomRedisClient

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

  // Lua Logic:
  // Iterate priorities.
  // Check delayed.
  // Check paused.
  // RPOP count.
  private static POP_MANY_SCRIPT = `
    local queue = KEYS[1]
    local prefix = ARGV[1]
    local count = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    local priorities = {'critical', 'high', 'default', 'low'}
    local result = {}

    for _, priority in ipairs(priorities) do
      if #result >= count then break end

      local key = prefix .. queue
      if priority ~= 'default' then
        key = key .. ':' .. priority
      end

      -- Check Delayed (Move to Ready if due)
      local delayKey = key .. ":delayed"
      -- Optimization: Only check delayed if we need more items
      -- Fetch up to (count - #result) delayed items
      local needed = count - #result
      local delayed = redis.call("ZRANGEBYSCORE", delayKey, 0, now, "LIMIT", 0, needed)

      for _, job in ipairs(delayed) do
        redis.call("ZREM", delayKey, job)
        -- We return it directly, assuming we want to process it now.
        -- Alternative: LPUSH to list and RPOP? No, direct return is faster.
        table.insert(result, job)
        needed = needed - 1
      end

      if #result >= count then break end

      -- Check Paused
      local isPaused = redis.call("GET", key .. ":paused")
      if isPaused ~= "1" then
        needed = count - #result
        -- Loop RPOP to get items
        for i = 1, needed do
            local job = redis.call("RPOP", key)
            if job then
                table.insert(result, job)
            else
                break
            end
        end
      end
    end

    return result
  `

  constructor(config: RedisDriverConfig) {
    this.client = config.client as CustomRedisClient
    this.prefix = config.prefix ?? 'queue:'

    if (!this.client) {
      throw new StreamError(500, StreamErrorCodes.CONFIGURATION_ERROR, {
        message:
          '[RedisDriver] Redis client is required. Please install ioredis or redis package.',
        retryable: false,
      })
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
        numberOfKeys: 1,
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
   * 判斷 job 是否應使用 binary frame 格式傳輸
   *
   * 當 type === 'binary' 且 data 為 Uint8Array 時啟用 binary path
   */
  private isBinaryJob(job: SerializedJob): boolean {
    return job.type === 'binary' && job.data instanceof Uint8Array
  }

  /**
   * 序列化 Job 為適合 Redis 儲存的格式
   *
   * Binary path：使用 BinaryJobFrame 格式（Uint8Array → Buffer）
   * Legacy path：使用 JSON.stringify（string）
   *
   * @returns Buffer（binary path）或 string（legacy path）
   */
  private serializeJobForTransport(job: SerializedJob, groupId?: string): RedisTransportPayload {
    // Binary path：job.type === 'binary' 且 data 是 Uint8Array
    if (this.isBinaryJob(job)) {
      // 若 groupId 來自 options，加入 job 中
      const jobWithGroup = groupId ? { ...job, groupId } : job
      const frame = encodeBinaryJobFrame(jobWithGroup)
      return { isBinary: true, buffer: Buffer.from(frame) }
    }

    // Legacy path：JSON 序列化
    const jobForTransport = prepareJobForTransport(job)
    const payloadObj = {
      id: jobForTransport.id,
      type: jobForTransport.type,
      data: jobForTransport.data,
      className: job.className,
      createdAt: job.createdAt,
      delaySeconds: job.delaySeconds,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      groupId: groupId ?? job.groupId,
      error: job.error,
      failedAt: job.failedAt,
    }
    return { isBinary: false, payload: JSON.stringify(payloadObj) }
  }

  private serializeJsonJobForTransport(job: SerializedJob, groupId?: string): string {
    const jobForTransport = prepareJobForTransport(job)
    return JSON.stringify({
      id: jobForTransport.id,
      type: jobForTransport.type,
      data: jobForTransport.data,
      className: job.className,
      createdAt: job.createdAt,
      delaySeconds: job.delaySeconds,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      groupId: groupId ?? job.groupId,
      error: job.error,
      failedAt: job.failedAt,
      priority: job.priority,
    })
  }

  /**
   * 自動偵測並解析 Redis payload 格式
   *
   * 1. 若輸入為 Buffer/Uint8Array 且以 Magic bytes 開頭 → 使用 BinaryJobFrame 解碼
   * 2. 否則 → 使用 JSON.parse（legacy path）
   *
   * @param payload - Redis 回傳的資料（string 或 Buffer）
   * @returns 解析後的 SerializedJob
   */
  private parsePayloadAuto(payload: string | Buffer): SerializedJob {
    // Binary frame 偵測：Buffer 類型且以 Magic bytes 開頭
    if (Buffer.isBuffer(payload)) {
      if (isGravitoJobFrame(payload)) {
        return decodeBinaryJobFrame(payload)
      }
      // 非 binary frame 的 Buffer：嘗試轉為字串後 JSON 解析
      return this.parseJsonPayload(payload.toString('utf8'))
    }

    // 字串類型：直接 JSON 解析
    return this.parseJsonPayload(payload)
  }

  /**
   * 解析 JSON 格式的 payload（legacy path）
   */
  private parseJsonPayload(payload: string): SerializedJob {
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
   * Pushes a job to Redis.
   *
   * 支援 binary path 和 legacy path：
   * - Binary path：job.type === 'binary' 且 data instanceof Uint8Array → 使用 BinaryJobFrame
   * - Legacy path：其他格式 → 使用 JSON.stringify
   *
   * @param queue - The queue name.
   * @param job - The serialized job.
   * @param options - Push options.
   */
  async push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void> {
    const key = this.getKey(queue, options?.priority)
    const groupId = options?.groupId

    if (typeof this.client.sadd === 'function') {
      await this.client.sadd(`${this.prefix}queues`, queue)
    }

    // Handle Group FIFO logic（只支援 legacy path，因為 Lua script 接受 string）
    if (groupId && typeof this.client.pushGroupJob === 'function') {
      const activeSetKey = `${this.prefix}active`
      const pendingListKey = `${this.prefix}pending:${groupId}`

      // Group FIFO 目前只支援 JSON（Lua script 接受 string payload）
      // Binary job 若有 groupId，改走一般 binary push（不使用 Lua）
      if (this.isBinaryJob(job)) {
        const serialized = this.serializeJobForTransport(job, groupId)
        if (!serialized.isBinary) {
          throw new StreamError(500, StreamErrorCodes.REDIS_BINARY_PAYLOAD_EXPECTED, {
            message: '[RedisDriver] Expected binary transport payload for binary job',
            retryable: false,
          })
        }
        const { buffer } = serialized
        // 使用 lpushBuffer 若可用，否則用一般 lpush（string）
        if (typeof this.client.lpushBuffer === 'function') {
          await this.client.lpushBuffer(key, buffer)
        } else {
          // 降級：binary frame 轉為 base64 string 存入 JSON
          const base64 = buffer.toString('base64')
          const legacyPayload = JSON.stringify({
            __binaryFrame: true,
            data: base64,
          })
          await this.client.lpush(key, legacyPayload)
        }
        return
      }

      // Legacy path 走 Lua
      await this.client.pushGroupJob(
        key,
        activeSetKey,
        pendingListKey,
        groupId,
        this.serializeJsonJobForTransport(job, groupId)
      )
      return
    }

    // Binary path：直接 push Buffer
    if (this.isBinaryJob(job)) {
      const serialized = this.serializeJobForTransport(job, groupId)
      if (serialized.isBinary) {
        // For delayed binary jobs
        if (job.delaySeconds && job.delaySeconds > 0) {
          const delayKey = `${key}:delayed`
          const score = Date.now() + job.delaySeconds * 1000
          if (typeof this.client.zadd === 'function') {
            // ZADD 不支援 Buffer，將 binary frame 轉為 base64 存入 ZSET member
            await this.client.zadd(delayKey, score, serialized.buffer.toString('base64'))
          } else {
            if (typeof this.client.lpushBuffer === 'function') {
              await this.client.lpushBuffer(key, serialized.buffer)
            } else {
              await this.client.lpush(key, serialized.buffer.toString('base64'))
            }
          }
        } else {
          if (typeof this.client.lpushBuffer === 'function') {
            await this.client.lpushBuffer(key, serialized.buffer)
          } else {
            // 降級：以 base64 存入（decode 時需要特別處理）
            await this.client.lpush(key, serialized.buffer.toString('base64'))
          }
        }
        return
      }
    }

    // Legacy path
    const payload = this.serializeJsonJobForTransport(job, groupId)

    // For delayed jobs, prefer Sorted Sets (ZADD) when supported
    if (job.delaySeconds && job.delaySeconds > 0) {
      const delayKey = `${key}:delayed`
      const score = Date.now() + job.delaySeconds * 1000
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
   * Completes a job.
   *
   * Crucial for Group FIFO logic to unlock the next job in the group.
   *
   * @param queue - The queue name.
   * @param job - The job to complete.
   */
  async complete(queue: string, job: SerializedJob): Promise<void> {
    if (!job.groupId) {
      return // Not a grouped job
    }

    const key = this.getKey(queue)
    const activeSetKey = `${this.prefix}active`
    const pendingListKey = `${this.prefix}pending:${job.groupId}`

    if (typeof this.client.completeGroupJob === 'function') {
      await this.client.completeGroupJob(key, activeSetKey, pendingListKey, job.groupId)
    }
  }

  /**
   * Pops a job from the queue.
   *
   * 支援 binary frame 自動偵測：
   * - 若 client 支援 rpopBuffer → 嘗試讀取 Buffer 並用 magic byte 判斷格式
   * - 否則降級為 string rpop，使用 parsePayloadAuto 解析
   *
   * @param queue - The queue name.
   * @returns The job or `null`.
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
      const result = await this.client.eval(script, keys.length, ...keys, Date.now().toString())

      if (isRedisEvalPopResult(result)) {
        return this.parsePayloadAuto(result[1])
      }
    } catch (_err) {
      // Fallback to manual loop if script fails
      return this.popManualFallback(queue)
    }

    return null
  }

  /**
   * Manual fallback for pop if Lua fails.
   *
   * 優先使用 rpopBuffer 取得 binary frame，否則降級為 string
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
          return this.parsePayloadAuto(payload)
        }
      }

      const isPaused = await this.client.get?.(`${key}:paused`)
      if (isPaused === '1') {
        continue
      }

      // 優先使用 rpopBuffer（支援 binary frame）
      if (typeof this.client.rpopBuffer === 'function') {
        const bufPayload = await this.client.rpopBuffer(key)
        if (bufPayload) {
          return this.parsePayloadAuto(bufPayload as Buffer)
        }
      } else {
        const payload = await this.client.rpop(key)
        if (payload) {
          return this.parsePayloadAuto(payload as string)
        }
      }
    }
    return null
  }

  /**
   * Pops a job using blocking Redis commands (BRPOP).
   *
   * 支援 brpopBuffer 取得 binary frame，否則降級為 string
   *
   * @param queues - The queues to listen to.
   * @param timeout - Timeout in seconds.
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

    // 優先使用 brpopBuffer（支援 binary frame）
    if (typeof this.client.brpopBuffer === 'function') {
      try {
        const result = await this.client.brpopBuffer(...keys, timeout)
        if (result && Array.isArray(result) && result.length >= 2) {
          return this.parsePayloadAuto(result[1])
        }
      } catch (_e) {
        // Timeout or error
      }
      return null
    }

    if (typeof this.client.brpop !== 'function') {
      return this.pop(queueList[0]!)
    }

    try {
      const result = await this.client.brpop(...keys, timeout)
      if (result && Array.isArray(result) && result.length >= 2) {
        return this.parsePayloadAuto(result[1])
      }
    } catch (_e) {
      // Timeout or error
    }

    return null
  }

  /**
   * Returns the length of the queue (Redis List length).
   *
   * @param queue - The queue name.
   */
  async size(queue: string): Promise<number> {
    const key = this.getKey(queue)
    return this.client.llen(key)
  }

  /**
   * Marks a job as permanently failed by moving it to a DLQ list.
   *
   * 支援 binary path：binary job 使用 BinaryJobFrame 格式存入 DLQ
   *
   * @param queue - The queue name.
   * @param job - The failed job.
   */
  async fail(queue: string, job: SerializedJob): Promise<void> {
    const key = `${this.getKey(queue)}:failed`
    const failedJob: SerializedJob = { ...job, failedAt: Date.now() }

    if (this.isBinaryJob(failedJob) && failedJob.data instanceof Uint8Array) {
      // Binary path：使用 BinaryJobFrame 格式存入 DLQ
      const frame = encodeBinaryJobFrame(failedJob)
      const buffer = Buffer.from(frame)

      if (typeof this.client.lpushBuffer === 'function') {
        await this.client.lpushBuffer(key, buffer)
      } else {
        // 降級：以 base64 存入 legacy JSON 包裝
        await this.client.lpush(
          key,
          JSON.stringify({
            ...failedJob,
            data: Buffer.from(failedJob.data).toString('base64'),
          })
        )
      }
    } else {
      // Legacy path
      const payload = JSON.stringify(failedJob)
      await this.client.lpush(key, payload)
    }

    // Optional: Keep DLQ capped at 1000 items to avoid bloat
    if (typeof this.client.ltrim === 'function') {
      await this.client.ltrim(key, 0, 999)
    }
  }

  /**
   * Clears the queue and its associated delayed/active sets.
   *
   * @param queue - The queue name.
   */
  async clear(queue: string): Promise<void> {
    const key = this.getKey(queue)
    const delayKey = `${key}:delayed`
    const activeSetKey = `${this.prefix}active`

    await this.client.del(key)
    if (this.client.del) {
      await this.client.del(delayKey)
      await this.client.del(activeSetKey)
    }
  }

  /**
   * Retrieves full stats for the queue using Redis Pipelining.
   *
   * @param queue - The queue name.
   */
  async stats(queue: string): Promise<QueueStats> {
    const priorities = ['critical', 'high', 'default', 'low']
    const stats: QueueStats = {
      queue,
      size: 0,
      delayed: 0,
      failed: 0,
    }

    const keys: string[] = []
    for (const p of priorities) {
      keys.push(this.getKey(queue, p === 'default' ? undefined : p))
    }

    try {
      if (typeof this.client.pipeline === 'function') {
        const pipe = this.client.pipeline()
        for (const key of keys) {
          pipe.llen(key)
          pipe.zcard(`${key}:delayed`)
        }
        pipe.llen(`${this.getKey(queue)}:failed`)

        const results = await pipe.exec()
        if (results) {
          let i = 0
          for (const _p of priorities) {
            stats.size += (results[i][1] as number) || 0
            stats.delayed! += (results[i + 1][1] as number) || 0
            i += 2
          }
          stats.failed = (results[i][1] as number) || 0
        }
      } else {
        for (const key of keys) {
          stats.size += (await this.client.llen?.(key)) || 0
          stats.delayed! += (await this.client.zcard?.(`${key}:delayed`)) || 0
        }
        stats.failed = (await this.client.llen?.(`${this.getKey(queue)}:failed`)) || 0
      }
    } catch (_err) {
      // Stats 失敗不影響主流程
    }

    return stats
  }

  /**
   * Pushes multiple jobs to the queue.
   *
   * 批次 push 支援 binary path 和 legacy path 混合使用。
   * 對於含有 binary job 的批次，透過 pipeline 分批處理。
   *
   * @param queue - The queue name.
   * @param jobs - Array of jobs.
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (jobs.length === 0) {
      return
    }

    const hasGroup = jobs.some((j) => j.groupId)
    const hasPriority = jobs.some((j) => j.priority !== undefined)

    if (hasGroup || hasPriority) {
      if (typeof this.client.pipeline === 'function') {
        const pipe = this.client.pipeline()
        for (const job of jobs) {
          const priority = job.priority
          const key = this.getKey(queue, priority)
          const groupId = job.groupId

          if (this.isBinaryJob(job)) {
            // Binary path：使用 BinaryJobFrame
            const jobWithGroup = groupId ? { ...job, groupId } : job
            const frame = encodeBinaryJobFrame(jobWithGroup)
            const buffer = Buffer.from(frame)

            if (groupId) {
              // Binary group job 不走 Lua，直接 lpush
              // 注意：這會破壞嚴格 FIFO，但這是 binary group job 的限制
              if (typeof pipe.lpushBuffer === 'function') {
                pipe.lpushBuffer(key, buffer)
              } else {
                pipe.lpush(key, buffer.toString('base64'))
              }
            } else {
              if (job.delaySeconds && job.delaySeconds > 0) {
                const delayKey = `${key}:delayed`
                const score = Date.now() + job.delaySeconds * 1000
                pipe.zadd(delayKey, score, buffer.toString('base64'))
              } else if (typeof pipe.lpushBuffer === 'function') {
                pipe.lpushBuffer(key, buffer)
              } else {
                pipe.lpush(key, buffer.toString('base64'))
              }
            }
          } else {
            // Legacy path
            const jobForTransport = prepareJobForTransport(job)
            const payload = JSON.stringify({
              id: jobForTransport.id,
              type: jobForTransport.type,
              data: jobForTransport.data,
              className: job.className,
              createdAt: job.createdAt,
              delaySeconds: job.delaySeconds,
              attempts: job.attempts,
              maxAttempts: job.maxAttempts,
              groupId: groupId,
              priority: priority,
              error: job.error,
              failedAt: job.failedAt,
            })

            if (groupId && typeof pipe.pushGroupJob === 'function') {
              const activeSetKey = `${this.prefix}active`
              const pendingListKey = `${this.prefix}pending:${groupId}`
              pipe.pushGroupJob(key, activeSetKey, pendingListKey, groupId, payload)
            } else if (job.delaySeconds && job.delaySeconds > 0) {
              const delayKey = `${key}:delayed`
              const score = Date.now() + job.delaySeconds * 1000
              pipe.zadd(delayKey, score, payload)
            } else {
              pipe.lpush(key, payload)
            }
          }
        }
        await pipe.exec()
        return
      }

      // Fallback
      for (const job of jobs) {
        await this.push(queue, job, {
          groupId: job.groupId,
          priority: job.priority,
        })
      }
      return
    }

    // 簡單批次（無 group 和 priority）
    const key = this.getKey(queue)

    // 分離 binary 和 legacy jobs
    const binaryJobs = jobs.filter((j) => this.isBinaryJob(j))
    const legacyJobs = jobs.filter((j) => !this.isBinaryJob(j))

    // Binary jobs：逐一 push（因為需要 Buffer API）
    if (binaryJobs.length > 0) {
      if (typeof this.client.lpushBuffer === 'function') {
        const buffers = binaryJobs.map((j) => Buffer.from(encodeBinaryJobFrame(j)))
        await this.client.lpushBuffer(key, ...buffers)
      } else {
        // 降級：sequential push
        for (const job of binaryJobs) {
          const frame = encodeBinaryJobFrame(job)
          await this.client.lpush(key, Buffer.from(frame).toString('base64'))
        }
      }
    }

    // Legacy jobs：batch push
    if (legacyJobs.length > 0) {
      const payloads = legacyJobs.map((job) => {
        const jobForTransport = prepareJobForTransport(job)
        return JSON.stringify({
          id: jobForTransport.id,
          type: jobForTransport.type,
          data: jobForTransport.data,
          className: job.className,
          createdAt: job.createdAt,
          delaySeconds: job.delaySeconds,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          groupId: job.groupId,
          priority: job.priority,
        })
      })

      await this.client.lpush(key, ...payloads)
    }
  }

  /**
   * Pops multiple jobs from the queue.
   *
   * 支援 binary frame 自動偵測格式。
   *
   * @param queue - The queue name.
   * @param count - Max jobs to pop.
   */
  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    if (count <= 0) {
      return []
    }

    if (count === 1) {
      const job = await this.pop(queue)
      return job ? [job] : []
    }

    // Use Lua script for atomic batch pop across priorities
    if (typeof this.client.popMany === 'function') {
      try {
        const result = await this.client.popMany(queue, this.prefix, count, Date.now().toString())
        if (Array.isArray(result) && result.length > 0) {
          return result.map((p: string) => this.parsePayloadAuto(p))
        }
        if (Array.isArray(result)) {
          return result.map((p: string) => this.parsePayloadAuto(p))
        }
      } catch (_err) {
        // Fallback to manual loop
      }
    }

    const priorities = ['critical', 'high', 'default', 'low']
    const results: SerializedJob[] = []
    let remaining = count

    for (const priority of priorities) {
      if (remaining <= 0) {
        break
      }

      const key = this.getKey(queue, priority === 'default' ? undefined : priority)

      const isPaused = await this.client.get?.(`${key}:paused`)
      if (isPaused === '1') {
        continue
      }

      let fetched: Array<string | Buffer> = []

      // 優先使用 rpopBuffer（支援 binary frame）
      if (typeof this.client.rpopBuffer === 'function') {
        try {
          const reply = await this.client.rpopBuffer(key, remaining)
          if (reply) {
            fetched = Array.isArray(reply) ? reply : [reply]
          }
        } catch (_e) {
          // Fallback
        }
      } else {
        // 一般 string rpop
        try {
          const reply = await this.client.rpop(key, remaining)
          if (reply) {
            fetched = Array.isArray(reply) ? reply : [reply]
          }
        } catch (_e) {
          if (typeof this.client.pipeline === 'function') {
            const pipeline = this.client.pipeline()
            for (let i = 0; i < remaining; i++) {
              pipeline.rpop(key)
            }
            const replies = await pipeline.exec()
            if (replies) {
              fetched = (replies as PipelineReply<string | null>[])
                .map((reply) => reply[1])
                .filter((reply): reply is string => reply !== null)
            }
          } else {
            for (let i = 0; i < remaining; i++) {
              const res = await this.client.rpop(key)
              if (res) {
                fetched.push(res as string)
              } else {
                break
              }
            }
          }
        }
      }

      if (fetched.length > 0) {
        for (const payload of fetched) {
          try {
            results.push(this.parsePayloadAuto(payload as string | Buffer))
          } catch (_e) {
            // 解析失敗的 payload 略過
          }
        }
        remaining -= fetched.length
      }
    }

    return results
  }

  /**
   * Reports a worker heartbeat.
   */
  async reportHeartbeat(workerInfo: WorkerHeartbeatPayload, prefix?: string): Promise<void> {
    const key = `${prefix ?? this.prefix}worker:${workerInfo.id}`
    if (typeof this.client.set === 'function') {
      await this.client.set(key, JSON.stringify(workerInfo), 'EX', 10)
    }
  }

  /**
   * Publishes monitoring logs.
   */
  async publishLog(logPayload: LogPayload, prefix?: string): Promise<void> {
    const payload = JSON.stringify(logPayload)
    const monitorPrefix = prefix ?? this.prefix

    if (typeof this.client.publish === 'function') {
      await this.client.publish(`${monitorPrefix}logs`, payload)
    }

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
   * Checks the rate limit for a queue.
   */
  async checkRateLimit(queue: string, config: { max: number; duration: number }): Promise<boolean> {
    const key = `${this.prefix}${queue}:ratelimit`
    const now = Date.now()
    const windowStart = Math.floor(now / config.duration)
    const windowKey = `${key}:${windowStart}`

    const client = this.client
    if (typeof client.incr === 'function') {
      const current = await client.incr(windowKey)
      if (current === 1 && client.expire) {
        await client.expire(windowKey, Math.ceil(config.duration / 1000) + 1)
      }
      return current <= config.max
    }

    return true
  }

  /**
   * Retrieves failed jobs from the DLQ.
   *
   * 支援 lrangeBuffer 讀取 binary frame，否則降級為 string lrange
   *
   * @param queue - The queue name.
   * @param start - Start index.
   * @param end - End index.
   */
  async getFailed(queue: string, start = 0, end = -1): Promise<SerializedJob[]> {
    const key = `${this.getKey(queue)}:failed`

    // 優先使用 lrangeBuffer（支援 binary frame）
    if (typeof this.client.lrangeBuffer === 'function') {
      const payloads = await this.client.lrangeBuffer(key, start, end)
      return payloads.map((p: Buffer) => this.parsePayloadAuto(p))
    }

    if (typeof this.client.lrange !== 'function') {
      return []
    }
    const payloads = await this.client.lrange(key, start, end)
    return payloads.map((p: string) => this.parsePayloadAuto(p))
  }

  /**
   * Retries failed jobs.
   *
   * @param queue - The queue name.
   * @param count - Jobs to retry.
   */
  async retryFailed(queue: string, count = 1): Promise<number> {
    const failedKey = `${this.getKey(queue)}:failed`
    let retried = 0

    for (let i = 0; i < count; i++) {
      if (typeof this.client.rpop !== 'function') {
        break
      }

      let job: SerializedJob | null = null

      // 優先使用 rpopBuffer（支援 binary frame）
      if (typeof this.client.rpopBuffer === 'function') {
        const bufPayload = await this.client.rpopBuffer(failedKey)
        if (!bufPayload) {
          break
        }
        job = this.parsePayloadAuto(bufPayload as Buffer)
      } else {
        const payload = await this.client.rpop(failedKey)
        if (!payload) {
          break
        }
        job = this.parsePayloadAuto(payload as string)
      }

      // Reset attempts and error
      const resetJob: SerializedJob = {
        ...job,
        attempts: 0,
      }
      delete resetJob.error
      delete resetJob.failedAt

      await this.push(queue, resetJob, {
        priority: resetJob.priority,
        groupId: resetJob.groupId,
      })
      retried++
    }

    return retried
  }

  /**
   * Clears the Dead Letter Queue.
   *
   * @param queue - The queue name.
   */
  async clearFailed(queue: string): Promise<void> {
    const key = `${this.getKey(queue)}:failed`
    await this.client.del(key)
  }

  /**
   * Retrieves all discovered queue names from Redis.
   */
  async getQueues(): Promise<string[]> {
    if (typeof this.client.smembers === 'function') {
      const queues = await this.client.smembers(`${this.prefix}queues`)
      return Array.isArray(queues) ? queues.sort() : []
    }
    return ['default']
  }

  /**
   * Enables real-time notifications for job arrivals via Redis Pub/Sub.
   *
   * Sets up the pub/sub connection and prepares for notification callbacks.
   *
   * @throws {Error} If the Redis client doesn't support pub/sub operations.
   */
  async enableNotifications(): Promise<void> {
    if (!this.client.subscribe || !this.client.on) {
      throw new StreamError(500, StreamErrorCodes.REDIS_PUBSUB_NOT_SUPPORTED, {
        message: '[RedisDriver] Client does not support pub/sub for reactive notifications',
        retryable: false,
      })
    }
    // Pub/sub is ready to use when onNotify is called
  }

  /**
   * Disables real-time notifications for job arrivals.
   *
   * Stops listening to notification channels.
   */
  async disableNotifications(): Promise<void> {
    if (this.client.unsubscribe && typeof this.client.unsubscribe === 'function') {
      try {
        await this.client.unsubscribe()
      } catch (_e) {
        // Ignore errors during unsubscribe
      }
    }
  }

  /**
   * Registers a notification listener for one or more queues.
   *
   * Uses Redis Pub/Sub to listen for job arrivals. When a job is pushed,
   * the driver publishes a notification that triggers the callback.
   *
   * @param queues - Queue name(s) to listen for.
   * @param callback - Function called with queue name when a job arrives.
   */
  async onNotify(
    queues: string | string[],
    callback: (queue: string) => Promise<void>
  ): Promise<void> {
    if (!this.client.subscribe || !this.client.on) {
      throw new StreamError(500, StreamErrorCodes.REDIS_PUBSUB_NOT_SUPPORTED, {
        message: '[RedisDriver] Client does not support pub/sub for reactive notifications',
        retryable: false,
      })
    }

    const queueList = Array.isArray(queues) ? queues : [queues]
    const channels = queueList.map((q) => `${this.prefix}notify:${q}`)

    // Subscribe to notification channels
    try {
      await this.client.subscribe(...channels)
    } catch (err) {
      throw new StreamError(503, StreamErrorCodes.REDIS_SUBSCRIBE_FAILED, {
        message: `[RedisDriver] Failed to subscribe to notifications: ${err}`,
        retryable: true,
        cause: err instanceof Error ? err : new Error(String(err)),
      })
    }

    // Set up message handler
    this.client.on('message', async (channel: string, _message: string) => {
      // Extract queue name from channel
      const prefix = `${this.prefix}notify:`
      if (channel.startsWith(prefix)) {
        const queueName = channel.slice(prefix.length)
        try {
          await callback(queueName)
        } catch (err) {
          // Log but don't fail the notification handler
          console.error(`[RedisDriver] Notification callback error: ${err}`)
        }
      }
    })
  }
}
