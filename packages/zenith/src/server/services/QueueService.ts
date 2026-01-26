import { EventEmitter } from 'node:events'
import { type MySQLPersistence, QueueManager } from '@gravito/stream'
import { Redis } from 'ioredis'
import { AlertService } from './AlertService'
import { LogStreamProcessor } from './LogStreamProcessor'
import { MaintenanceScheduler } from './MaintenanceScheduler'
import { QueueMetricsCollector } from './QueueMetricsCollector'

/**
 * Snapshot of queue statistics.
 *
 * @public
 * @since 3.0.0
 */
export interface QueueStats {
  /** Name of the queue. */
  name: string
  /** Number of jobs waiting in the queue. */
  waiting: number
  /** Number of jobs delayed. */
  delayed: number
  /** Number of jobs that failed. */
  failed: number
  /** Number of jobs currently being processed. */
  active: number
  /** Whether the queue is currently paused. */
  paused: boolean
}

/**
 * Health report from a worker instance.
 *
 * @public
 * @since 3.0.0
 */
export interface WorkerReport {
  id: string
  hostname: string
  pid: number
  uptime: number
  memory: {
    rss: string
    heapTotal: string
    heapUsed: string
  }
  queues: string[]
  concurrency: number
  timestamp: string
  loadAvg: number[]
}

/**
 * A standard system log message.
 *
 * @public
 * @since 3.0.0
 */
export interface SystemLog {
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  workerId: string
  queue?: string
  timestamp: string
}

/**
 * Aggregated global statistics.
 *
 * @public
 * @since 3.0.0
 */
export interface GlobalStats {
  queues: QueueStats[]
  throughput: { timestamp: string; count: number }[]
  workers: WorkerReport[]
}

/**
 * QueueService acts as the central orchestrator for all queue-related operations.
 *
 * It bridges the gap between the raw Redis data, the persistent SQL storage,
 * and the real-time dashboard. It handles:
 * - Direct queue manipulation (pause, resume, purge).
 * - Job lifecycle management (retry, delete).
 * - System-wide metric aggregation and alerting.
 * - Log stream processing and archiving.
 *
 * This service is designed to be the single source of truth for the
 * Zenith Console.
 *
 * @public
 * @since 3.0.0
 */
export class QueueService {
  private redis: Redis
  private subRedis: Redis
  private prefix: string
  private logEmitter = new EventEmitter()
  private manager: QueueManager
  public alerts: AlertService
  private logProcessor: LogStreamProcessor
  private metricsCollector: QueueMetricsCollector
  private maintenanceScheduler: MaintenanceScheduler

  /**
   * Initializes the QueueService.
   *
   * @param redisUrl - The Redis connection string (e.g., redis://localhost:6379).
   * @param prefix - Key prefix for all Redis keys used by the queues.
   * @param persistence - Optional configuration for MySQL persistence.
   */
  constructor(
    redisUrl: string,
    prefix = 'queue:',
    persistence?: {
      adapter: MySQLPersistence
      archiveCompleted?: boolean
      archiveFailed?: boolean
      archiveEnqueued?: boolean
    }
  ) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
    })
    this.subRedis = new Redis(redisUrl, {
      lazyConnect: true,
    })
    this.prefix = prefix
    this.logEmitter.setMaxListeners(1000)

    this.logProcessor = new LogStreamProcessor(this.redis, this.subRedis)
    this.metricsCollector = new QueueMetricsCollector(this.redis, prefix)
    this.maintenanceScheduler = new MaintenanceScheduler(this.redis, (days) =>
      this.cleanupArchive(days)
    )

    this.manager = new QueueManager({
      default: 'redis',
      connections: {
        redis: {
          driver: 'redis',
          client: this.redis as any,
          prefix,
        },
      },
      persistence,
    })
    this.alerts = new AlertService(redisUrl)
  }

  /**
   * Connects to all required backing services.
   *
   * Establishes connections to Redis, the AlertService, and the LogStreamProcessor.
   * Also starts the maintenance scheduler.
   *
   * @returns Promise resolving when all connections are ready.
   * @throws {Error} If Redis or AlertService fails to connect.
   */
  async connect() {
    await Promise.all([
      this.redis.connect(),
      this.subRedis.connect(),
      this.alerts.connect(),
      this.logProcessor.subscribe(),
    ])

    this.maintenanceScheduler.start(30000)
  }

  /**
   * Subscribes to real-time system logs.
   *
   * @param callback - Function to be called when a new log arrives.
   * @returns Unsubscribe function.
   *
   * @example
   * ```typescript
   * const unsub = queueService.onLog((log) => {
   *   console.log('New log:', log.message);
   * });
   * // Later...
   * unsub();
   * ```
   */
  onLog(callback: (msg: SystemLog) => void): () => void {
    const unsub = this.logProcessor.onLog(callback)
    const emitterUnsub = () => {
      this.logEmitter.off('log', callback)
    }
    return () => {
      unsub()
      emitterUnsub()
    }
  }

  /**
   * Retrieves current statistics for all known queues.
   *
   * @returns List of queue statistics.
   */
  async listQueues(): Promise<QueueStats[]> {
    return this.metricsCollector.listQueues()
  }

  /**
   * Pauses a specific queue, preventing it from processing jobs.
   *
   * @param queueName - The name of the queue to pause.
   * @returns True if successful.
   * @throws {Error} If Redis operation fails.
   */
  async pauseQueue(queueName: string): Promise<boolean> {
    await this.redis.set(`${this.prefix}${queueName}:paused`, '1')
    return true
  }

  /**
   * Resumes a paused queue.
   *
   * @param queueName - The name of the queue to resume.
   * @returns True if successful.
   * @throws {Error} If Redis operation fails.
   */
  async resumeQueue(queueName: string): Promise<boolean> {
    await this.redis.del(`${this.prefix}${queueName}:paused`)
    return true
  }

  /**
   * Checks if a queue is currently paused.
   *
   * @param queueName - The name of the queue.
   * @returns True if paused, false otherwise.
   */
  async isQueuePaused(queueName: string): Promise<boolean> {
    const paused = await this.redis.get(`${this.prefix}${queueName}:paused`)
    return paused === '1'
  }

  /**
   * Moves all delayed jobs in a queue back to the waiting list immediately.
   *
   * Useful for manually forcing retries or clearing backlogs.
   *
   * @param queueName - The name of the queue.
   * @returns The number of jobs moved.
   */
  async retryDelayedJob(queueName: string): Promise<number> {
    const key = `${this.prefix}${queueName}`
    const delayKey = `${key}:delayed`

    const script = `
        local delayKey = KEYS[1]
        local queueKey = KEYS[2]
        
        local jobs = redis.call('ZRANGE', delayKey, 0, -1)
        
        if #jobs > 0 then
            redis.call('LPUSH', queueKey, unpack(jobs))
            redis.call('DEL', delayKey)
        end
        return #jobs
      `

    const movedCount = (await this.redis.eval(script, 2, delayKey, key)) as number
    return movedCount
  }

  /**
   * Retrieves a paginated list of jobs from a specific queue and state.
   *
   * @param queueName - The queue to query.
   * @param type - The state to filter by (waiting, delayed, failed).
   * @param start - Start index (0-based).
   * @param stop - Stop index (inclusive).
   * @returns List of job objects.
   */
  async getJobs(
    queueName: string,
    type: 'waiting' | 'delayed' | 'failed' = 'waiting',
    start = 0,
    stop = 49
  ): Promise<any[]> {
    const key = `${this.prefix}${queueName}`
    let rawJobs: string[] = []

    if (type === 'delayed') {
      const results = await this.redis.zrange(`${key}:delayed`, start, stop, 'WITHSCORES')
      const formatted = []
      for (let i = 0; i < results.length; i += 2) {
        const jobStr = results[i]!
        const score = results[i + 1]!
        try {
          const parsed = JSON.parse(jobStr)
          formatted.push({
            ...parsed,
            _raw: jobStr,
            scheduledAt: new Date(parseInt(score, 10)).toISOString(),
          })
        } catch (_e) {
          formatted.push({ _raw: jobStr, _error: 'Failed to parse JSON' })
        }
      }
      return formatted
    } else {
      const listKey = type === 'failed' ? `${key}:failed` : key
      rawJobs = await this.redis.lrange(listKey, start, stop)

      const jobs = rawJobs.map((jobStr) => {
        try {
          const parsed = JSON.parse(jobStr)
          return { ...parsed, _raw: jobStr }
        } catch (_e) {
          return { _raw: jobStr, _error: 'Failed to parse JSON' }
        }
      })

      const persistence = this.manager.getPersistence()
      if (jobs.length < stop - start + 1 && persistence && type === 'failed') {
        const archived = await persistence.list(queueName, {
          limit: stop - start + 1 - jobs.length,
          status: type as 'failed',
        })
        return [...jobs, ...archived.map((a: any) => ({ ...a, _archived: true }))]
      }

      return jobs
    }
  }

  /**
   * Records a snapshot of system metrics and triggers alerts if needed.
   *
   * Called periodically by the metrics collector.
   *
   * @param nodes - Current state of nodes (from PulseService).
   * @param injectedWorkers - Optional worker data (for testing).
   */
  async recordStatusMetrics(
    nodes: Record<string, any> = {},
    injectedWorkers?: any[]
  ): Promise<void> {
    const stats = await this.listQueues()
    const totals = stats.reduce(
      (acc, q) => {
        acc.waiting += q.waiting
        acc.delayed += q.delayed
        acc.failed += q.failed
        return acc
      },
      { waiting: 0, delayed: 0, failed: 0 }
    )

    const now = Math.floor(Date.now() / 60000)
    const pipe = this.redis.pipeline()

    pipe.set(`flux_console:metrics:waiting:${now}`, totals.waiting, 'EX', 3600)
    pipe.set(`flux_console:metrics:delayed:${now}`, totals.delayed, 'EX', 3600)
    pipe.set(`flux_console:metrics:failed:${now}`, totals.failed, 'EX', 3600)

    const workers = injectedWorkers || (await this.listWorkers())
    pipe.set(`flux_console:metrics:workers:${now}`, workers.length, 'EX', 3600)

    await pipe.exec()

    this.logEmitter.emit('stats', {
      queues: stats,
      throughput: await this.getThroughputData(),
      workers,
    })

    this.alerts
      .check({
        queues: stats,
        nodes: nodes as any,
        workers: workers as any,
        totals,
      })
      .catch((err) => console.error('[AlertService] Rule Evaluation Error:', err))
  }

  /**
   * Subscribes to global stats updates.
   *
   * @param callback - Function called with new stats.
   * @returns Unsubscribe function.
   */
  onStats(callback: (stats: GlobalStats) => void): () => void {
    this.logEmitter.on('stats', callback)
    return () => {
      this.logEmitter.off('stats', callback)
    }
  }

  /**
   * Retrieves historical data for a specific metric.
   *
   * @param metric - The metric name (waiting, delayed, failed, workers).
   * @param limit - Number of data points to return (minutes).
   * @returns Array of values.
   */
  async getMetricHistory(metric: string, limit = 15): Promise<number[]> {
    const now = Math.floor(Date.now() / 60000)
    const keys = []
    for (let i = limit - 1; i >= 0; i--) {
      keys.push(`flux_console:metrics:${metric}:${now - i}`)
    }

    const values = await this.redis.mget(...keys)
    return values.map((v) => parseInt(v || '0', 10))
  }

  /**
   * Calculates system throughput (jobs per minute).
   *
   * @returns Array of { timestamp, count } objects for the last 15 minutes.
   */
  async getThroughputData(): Promise<{ timestamp: string; count: number }[]> {
    const now = Math.floor(Date.now() / 60000)
    const results = []

    for (let i = 14; i >= 0; i--) {
      const t = now - i
      const count = await this.redis.get(`flux_console:throughput:${t}`)
      const date = new Date(t * 60000)
      results.push({
        timestamp: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        count: parseInt(count || '0', 10),
      })
    }

    return results
  }

  /**
   * Lists all active workers.
   *
   * @returns Array of worker reports.
   */
  async listWorkers(): Promise<WorkerReport[]> {
    return this.metricsCollector.listWorkers()
  }

  /**
   * Deletes a specific job from a queue.
   *
   * @param queueName - The queue name.
   * @param type - The list to remove from (waiting, delayed, failed).
   * @param jobRaw - The raw JSON string of the job to remove.
   * @returns True if removed, false otherwise.
   */
  async deleteJob(
    queueName: string,
    type: 'waiting' | 'delayed' | 'failed',
    jobRaw: string
  ): Promise<boolean> {
    const key =
      type === 'delayed'
        ? `${this.prefix}${queueName}:delayed`
        : type === 'failed'
          ? `${this.prefix}${queueName}:failed`
          : `${this.prefix}${queueName}`
    const result =
      type === 'delayed'
        ? await this.redis.zrem(key, jobRaw)
        : await this.redis.lrem(key, 0, jobRaw)
    return result > 0
  }

  /**
   * Retries a specific failed or delayed job immediately.
   *
   * @param queueName - The queue name.
   * @param jobRaw - The raw JSON string of the job.
   * @returns True if successfully moved to waiting list.
   */
  async retryJob(queueName: string, jobRaw: string): Promise<boolean> {
    const key = `${this.prefix}${queueName}`
    const delayKey = `${key}:delayed`

    const script = `
      local delayKey = KEYS[1]
      local queueKey = KEYS[2]
      local jobRaw = ARGV[1]
      
      local removed = redis.call('ZREM', delayKey, jobRaw)
      if removed > 0 then
        redis.call('LPUSH', queueKey, jobRaw)
        return 1
      end
      return 0
    `
    const result = await this.redis.eval(script, 2, delayKey, key, jobRaw)
    return result === 1
  }

  /**
   * Purges all jobs from a queue (waiting, delayed, failed, active).
   *
   * ⚠️ Destructive operation. Irreversible.
   *
   * @param queueName - The queue to purge.
   */
  async purgeQueue(queueName: string): Promise<void> {
    const pipe = this.redis.pipeline()
    pipe.del(`${this.prefix}${queueName}`)
    pipe.del(`${this.prefix}${queueName}:delayed`)
    pipe.del(`${this.prefix}${queueName}:failed`)
    pipe.del(`${this.prefix}${queueName}:active`)
    await pipe.exec()
  }

  /**
   * Retries all failed jobs in a queue.
   *
   * @param queueName - The queue name.
   * @returns Number of jobs retried.
   */
  async retryAllFailedJobs(queueName: string): Promise<number> {
    return await this.manager.retryFailed(queueName, 10000)
  }

  /**
   * Clears all failed jobs from a queue.
   *
   * @param queueName - The queue name.
   */
  async clearFailedJobs(queueName: string): Promise<void> {
    await this.manager.clearFailed(queueName)
  }

  /**
   * Gets the count of jobs in a specific state.
   *
   * @param queueName - Queue name.
   * @param type - Job state.
   * @returns Count of jobs.
   */
  async getJobCount(queueName: string, type: 'waiting' | 'delayed' | 'failed'): Promise<number> {
    const key =
      type === 'delayed'
        ? `${this.prefix}${queueName}:delayed`
        : type === 'failed'
          ? `${this.prefix}${queueName}:failed`
          : `${this.prefix}${queueName}`

    return type === 'delayed' ? await this.redis.zcard(key) : await this.redis.llen(key)
  }

  /**
   * Deletes all jobs in a specific state from a queue.
   *
   * @param queueName - Queue name.
   * @param type - Job state to clear.
   * @returns Number of jobs deleted.
   */
  async deleteAllJobs(queueName: string, type: 'waiting' | 'delayed' | 'failed'): Promise<number> {
    const key =
      type === 'delayed'
        ? `${this.prefix}${queueName}:delayed`
        : type === 'failed'
          ? `${this.prefix}${queueName}:failed`
          : `${this.prefix}${queueName}`

    const count = await this.getJobCount(queueName, type)
    await this.redis.del(key)
    return count
  }

  /**
   * Retries all jobs in a specific state (delayed or failed).
   *
   * @param queueName - Queue name.
   * @param type - Job state.
   * @returns Number of jobs retried.
   */
  async retryAllJobs(queueName: string, type: 'delayed' | 'failed'): Promise<number> {
    if (type === 'delayed') {
      return await this.retryDelayedJob(queueName)
    } else {
      return await this.retryAllFailedJobs(queueName)
    }
  }

  /**
   * Deletes a specific set of jobs.
   *
   * @param queueName - Queue name.
   * @param type - Job state.
   * @param jobRaws - Array of raw job strings.
   * @returns Number of jobs deleted.
   */
  async deleteJobs(
    queueName: string,
    type: 'waiting' | 'delayed' | 'failed',
    jobRaws: string[]
  ): Promise<number> {
    const key =
      type === 'delayed'
        ? `${this.prefix}${queueName}:delayed`
        : type === 'failed'
          ? `${this.prefix}${queueName}:failed`
          : `${this.prefix}${queueName}`

    const pipe = this.redis.pipeline()
    for (const raw of jobRaws) {
      if (type === 'delayed') {
        pipe.zrem(key, raw)
      } else {
        pipe.lrem(key, 1, raw)
      }
    }
    const results = await pipe.exec()
    return results?.reduce((acc, [_, res]) => acc + ((res as number) || 0), 0) || 0
  }

  /**
   * Retries a specific set of jobs.
   *
   * @param queueName - Queue name.
   * @param type - Job state.
   * @param jobRaws - Array of raw job strings.
   * @returns Number of jobs retried.
   */
  async retryJobs(
    queueName: string,
    type: 'delayed' | 'failed',
    jobRaws: string[]
  ): Promise<number> {
    const key = `${this.prefix}${queueName}`
    const sourceKey = type === 'delayed' ? `${key}:delayed` : `${key}:failed`

    const pipe = this.redis.pipeline()
    for (const raw of jobRaws) {
      if (type === 'delayed') {
        pipe.zrem(sourceKey, raw)
        pipe.lpush(key, raw)
      } else {
        pipe.lrem(sourceKey, 1, raw)
        pipe.lpush(key, raw)
      }
    }
    const results = await pipe.exec()
    let count = 0
    if (results) {
      for (let i = 0; i < results.length; i += 2) {
        const result = results[i]
        if (result && !result[0] && (result[1] as number) > 0) {
          count++
        }
      }
    }
    return count
  }

  /**
   * Publishes a log message to the stream and archives it.
   *
   * @param log - Log entry details.
   */
  async publishLog(log: { level: string; message: string; workerId: string; queue?: string }) {
    const payload = {
      ...log,
      timestamp: new Date().toISOString(),
    }
    await this.redis.publish('flux_console:logs', JSON.stringify(payload))

    const pipe = this.redis.pipeline()
    pipe.lpush('flux_console:logs:history', JSON.stringify(payload))
    pipe.ltrim('flux_console:logs:history', 0, 99)

    const now = Math.floor(Date.now() / 60000)
    pipe.incr(`flux_console:throughput:${now}`)
    pipe.expire(`flux_console:throughput:${now}`, 3600)

    await pipe.exec()

    const persistence = this.manager.getPersistence()
    if (persistence) {
      persistence
        .archiveLog({
          ...log,
          timestamp: new Date(),
        })
        .catch((err: any) => console.error('[QueueService] Log Archive Error:', err))
    }
  }

  /**
   * Retrieves recent log history from Redis.
   *
   * @returns List of recent logs (max 100).
   */
  async getLogHistory(): Promise<any[]> {
    const logs = await this.redis.lrange('flux_console:logs:history', 0, -1)
    return logs.map((l) => JSON.parse(l)).reverse()
  }

  /**
   * Searches for jobs across all queues and states.
   *
   * Scans Redis structures in real-time. Note: This can be expensive on large queues.
   *
   * @param query - Search term (ID, name, or data).
   * @param options - Search options (limit, type).
   * @returns List of matching jobs.
   */
  async searchJobs(
    query: string,
    options: { limit?: number; type?: 'all' | 'waiting' | 'delayed' | 'failed' } = {}
  ): Promise<any[]> {
    const { limit = 20, type = 'all' } = options
    const results: any[] = []
    const queryLower = query.toLowerCase()

    const queues = await this.listQueues()

    for (const queue of queues) {
      if (results.length >= limit) {
        break
      }

      const types = type === 'all' ? ['waiting', 'delayed', 'failed'] : [type]

      for (const jobType of types) {
        if (results.length >= limit) {
          break
        }

        const jobs = await this.getJobs(queue.name, jobType as any, 0, 99)

        for (const job of jobs) {
          if (results.length >= limit) {
            break
          }

          const idMatch = job.id && String(job.id).toLowerCase().includes(queryLower)
          const nameMatch = job.name && String(job.name).toLowerCase().includes(queryLower)

          let dataMatch = false
          try {
            const dataStr = JSON.stringify(job.data || job).toLowerCase()
            dataMatch = dataStr.includes(queryLower)
          } catch (_e) {}

          if (idMatch || nameMatch || dataMatch) {
            results.push({
              ...job,
              _queue: queue.name,
              _type: jobType,
              _matchType: idMatch ? 'id' : nameMatch ? 'name' : 'data',
            })
          }
        }
      }
    }

    return results
  }

  /**
   * Retrieves archived jobs from persistent storage (MySQL).
   *
   * @param queue - Queue name.
   * @param page - Page number.
   * @param limit - Page size.
   * @param status - Filter by status.
   * @param filter - Additional filters (jobId, time range).
   * @returns Paginated list of jobs.
   */
  async getArchiveJobs(
    queue: string,
    page = 1,
    limit = 50,
    status?: 'completed' | 'failed',
    filter: { jobId?: string; startTime?: Date; endTime?: Date } = {}
  ): Promise<{ jobs: any[]; total: number }> {
    const persistence = this.manager.getPersistence()
    if (!persistence) {
      return { jobs: [], total: 0 }
    }

    const offset = (page - 1) * limit
    const [jobs, total] = await Promise.all([
      persistence.list(queue, { limit, offset, status, ...filter }),
      persistence.count(queue, { status, ...filter }),
    ])

    return {
      jobs: jobs.map((j: any) => ({ ...j, _archived: true })),
      total,
    }
  }

  /**
   * Searches archived jobs in persistent storage.
   *
   * @param query - Search term.
   * @param options - Pagination options.
   * @returns Matching jobs.
   */
  async searchArchive(
    query: string,
    options: { limit?: number; page?: number; queue?: string } = {}
  ): Promise<{ jobs: any[]; total: number }> {
    const persistence = this.manager.getPersistence() as any
    if (!persistence || typeof persistence.search !== 'function') {
      return { jobs: [], total: 0 }
    }

    const { limit = 50, page = 1, queue } = options
    const offset = (page - 1) * limit

    const jobs = await persistence.search(query, { limit, offset, queue })
    return {
      jobs: jobs.map((j: any) => ({ ...j, _archived: true })),
      total: jobs.length === limit ? limit * page + 1 : (page - 1) * limit + jobs.length,
    }
  }

  /**
   * Retrieves archived logs from persistent storage.
   *
   * @param options - Filters and pagination.
   * @returns Paginated logs.
   */
  async getArchivedLogs(
    options: {
      page?: number
      limit?: number
      level?: string
      workerId?: string
      queue?: string
      search?: string
      startTime?: Date
      endTime?: Date
    } = {}
  ): Promise<{ logs: any[]; total: number }> {
    const persistence = this.manager.getPersistence()
    if (!persistence) {
      return { logs: [], total: 0 }
    }

    const { page = 1, limit = 50, ...filters } = options
    const offset = (page - 1) * limit

    const [logs, total] = await Promise.all([
      persistence.listLogs({ limit, offset, ...filters }),
      persistence.countLogs(filters),
    ])

    return { logs, total }
  }

  /**
   * Cleans up old archived data based on retention policy.
   *
   * @param days - Retention period in days.
   * @returns Number of records deleted.
   */
  async cleanupArchive(days: number): Promise<number> {
    const persistence = this.manager.getPersistence()
    if (!persistence) {
      return 0
    }
    return await persistence.cleanup(days)
  }

  /**
   * Lists all registered Cron schedules.
   *
   * @returns List of schedules.
   */
  async listSchedules(): Promise<any[]> {
    const scheduler = this.manager.getScheduler()
    return await scheduler.list()
  }

  /**
   * Registers a new Cron schedule.
   *
   * @param config - Schedule configuration.
   */
  async registerSchedule(config: {
    id: string
    cron: string
    queue: string
    job: any
  }): Promise<void> {
    const scheduler = this.manager.getScheduler()
    await scheduler.register(config)
  }

  /**
   * Removes a Cron schedule.
   *
   * @param id - Schedule ID.
   */
  async removeSchedule(id: string): Promise<void> {
    const scheduler = this.manager.getScheduler()
    await scheduler.remove(id)
  }

  /**
   * Manually triggers a scheduled job immediately.
   *
   * @param id - Schedule ID.
   */
  async runScheduleNow(id: string): Promise<void> {
    const scheduler = this.manager.getScheduler()
    await scheduler.runNow(id)
  }

  /**
   * Processes schedule ticks.
   *
   * Should be called periodically to check for due schedules.
   */
  async tickScheduler(): Promise<void> {
    const scheduler = this.manager.getScheduler()
    await scheduler.tick()
  }
}
