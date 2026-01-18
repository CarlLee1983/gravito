import { EventEmitter } from 'node:events'
import { type MySQLPersistence, QueueManager } from '@gravito/stream'
import { Redis } from 'ioredis'
import { AlertService } from './AlertService'
import { LogStreamProcessor } from './LogStreamProcessor'
import { MaintenanceScheduler } from './MaintenanceScheduler'
import { QueueMetricsCollector } from './QueueMetricsCollector'

export interface QueueStats {
  name: string
  waiting: number
  delayed: number
  failed: number
  active: number
  paused: boolean
}

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

export interface SystemLog {
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  workerId: string
  queue?: string
  timestamp: string
}

export interface GlobalStats {
  queues: QueueStats[]
  throughput: { timestamp: string; count: number }[]
  workers: WorkerReport[]
}

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

  async connect() {
    await Promise.all([
      this.redis.connect(),
      this.subRedis.connect(),
      this.alerts.connect(),
      this.logProcessor.subscribe(),
    ])

    this.maintenanceScheduler.start(30000)
  }

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

  async listQueues(): Promise<QueueStats[]> {
    return this.metricsCollector.listQueues()
  }

  async pauseQueue(queueName: string): Promise<boolean> {
    await this.redis.set(`${this.prefix}${queueName}:paused`, '1')
    return true
  }

  async resumeQueue(queueName: string): Promise<boolean> {
    await this.redis.del(`${this.prefix}${queueName}:paused`)
    return true
  }

  async isQueuePaused(queueName: string): Promise<boolean> {
    const paused = await this.redis.get(`${this.prefix}${queueName}:paused`)
    return paused === '1'
  }

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

  onStats(callback: (stats: GlobalStats) => void): () => void {
    this.logEmitter.on('stats', callback)
    return () => {
      this.logEmitter.off('stats', callback)
    }
  }

  async getMetricHistory(metric: string, limit = 15): Promise<number[]> {
    const now = Math.floor(Date.now() / 60000)
    const keys = []
    for (let i = limit - 1; i >= 0; i--) {
      keys.push(`flux_console:metrics:${metric}:${now - i}`)
    }

    const values = await this.redis.mget(...keys)
    return values.map((v) => parseInt(v || '0', 10))
  }

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

  async listWorkers(): Promise<WorkerReport[]> {
    return this.metricsCollector.listWorkers()
  }

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

  async purgeQueue(queueName: string): Promise<void> {
    const pipe = this.redis.pipeline()
    pipe.del(`${this.prefix}${queueName}`)
    pipe.del(`${this.prefix}${queueName}:delayed`)
    pipe.del(`${this.prefix}${queueName}:failed`)
    pipe.del(`${this.prefix}${queueName}:active`)
    await pipe.exec()
  }

  async retryAllFailedJobs(queueName: string): Promise<number> {
    return await this.manager.retryFailed(queueName, 10000)
  }

  async clearFailedJobs(queueName: string): Promise<void> {
    await this.manager.clearFailed(queueName)
  }

  async getJobCount(queueName: string, type: 'waiting' | 'delayed' | 'failed'): Promise<number> {
    const key =
      type === 'delayed'
        ? `${this.prefix}${queueName}:delayed`
        : type === 'failed'
          ? `${this.prefix}${queueName}:failed`
          : `${this.prefix}${queueName}`

    return type === 'delayed' ? await this.redis.zcard(key) : await this.redis.llen(key)
  }

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

  async retryAllJobs(queueName: string, type: 'delayed' | 'failed'): Promise<number> {
    if (type === 'delayed') {
      return await this.retryDelayedJob(queueName)
    } else {
      return await this.retryAllFailedJobs(queueName)
    }
  }

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

  async getLogHistory(): Promise<any[]> {
    const logs = await this.redis.lrange('flux_console:logs:history', 0, -1)
    return logs.map((l) => JSON.parse(l)).reverse()
  }

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

  async cleanupArchive(days: number): Promise<number> {
    const persistence = this.manager.getPersistence()
    if (!persistence) {
      return 0
    }
    return await persistence.cleanup(days)
  }

  async listSchedules(): Promise<any[]> {
    const scheduler = this.manager.getScheduler()
    return await scheduler.list()
  }

  async registerSchedule(config: {
    id: string
    cron: string
    queue: string
    job: any
  }): Promise<void> {
    const scheduler = this.manager.getScheduler()
    await scheduler.register(config)
  }

  async removeSchedule(id: string): Promise<void> {
    const scheduler = this.manager.getScheduler()
    await scheduler.remove(id)
  }

  async runScheduleNow(id: string): Promise<void> {
    const scheduler = this.manager.getScheduler()
    await scheduler.runNow(id)
  }

  async tickScheduler(): Promise<void> {
    const scheduler = this.manager.getScheduler()
    await scheduler.tick()
  }
}
