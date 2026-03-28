import type { Redis } from 'ioredis'
import { ZenithError } from '../../errors/ZenithError'
import { ZenithErrorCodes } from '../../errors/codes'
import type { GlobalStats, QueueStats, WorkerReport } from './QueueService'

export class QueueMetricsCollector {
  constructor(
    private redis: Redis,
    private prefix = 'queue:'
  ) {}

  /**
   * Discover all queues using SCAN to avoid blocking Redis
   */
  async listQueues(): Promise<QueueStats[]> {
    const queues = new Set<string>()
    let cursor = '0'
    let iterations = 0
    const MAX_ITERATIONS = 1000

    do {
      const result = await this.redis.scan(cursor, 'MATCH', `${this.prefix}*`, 'COUNT', 100)
      cursor = result[0]
      const keys = result[1]

      for (const key of keys) {
        const relative = key.slice(this.prefix.length)
        const parts = relative.split(':')
        const candidateName = parts[0]

        if (candidateName && !this.isSystemKey(candidateName)) {
          queues.add(candidateName)
        }
      }

      iterations++
    } while (cursor !== '0' && iterations < MAX_ITERATIONS)

    return this.collectQueueStats(Array.from(queues).sort())
  }

  /**
   * Collect statistics for a list of queues
   */
  private async collectQueueStats(queueNames: string[]): Promise<QueueStats[]> {
    const stats: QueueStats[] = []
    const BATCH_SIZE = 10

    for (let i = 0; i < queueNames.length; i += BATCH_SIZE) {
      const batch = queueNames.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map(async (name) => this.getQueueStats(name)))
      stats.push(...batchResults)
    }

    return stats
  }

  /**
   * Get statistics for a single queue
   */
  private async getQueueStats(name: string): Promise<QueueStats> {
    const waiting = await this.redis.llen(`${this.prefix}${name}`)
    const delayed = await this.redis.zcard(`${this.prefix}${name}:delayed`)
    const failed = await this.redis.llen(`${this.prefix}${name}:failed`)
    const active = await this.redis.scard(`${this.prefix}${name}:active`)
    const paused = await this.redis.get(`${this.prefix}${name}:paused`)

    return {
      name,
      waiting,
      delayed,
      failed,
      active,
      paused: paused === '1',
    }
  }

  /**
   * Get global statistics including throughput
   */
  async getGlobalStats(): Promise<GlobalStats> {
    const queues = await this.listQueues()
    const throughput = await this.getThroughputData()

    return {
      queues,
      throughput,
      workers: [],
    }
  }

  /**
   * Get throughput data for the last hour
   */
  private async getThroughputData(): Promise<{ timestamp: string; count: number }[]> {
    const data: { timestamp: string; count: number }[] = []
    const currentMinute = Math.floor(Date.now() / 60000)

    for (let i = 0; i < 60; i++) {
      const minute = currentMinute - i
      const count = await this.redis.get(`flux_console:throughput:${minute}`)
      data.push({
        timestamp: new Date(minute * 60000).toISOString(),
        count: Number(count) || 0,
      })
    }

    return data.reverse()
  }

  /**
   * Get reports from all active workers
   */
  async listWorkers(): Promise<WorkerReport[]> {
    const workers = await this.redis.smembers('flux_console:workers')

    return Promise.all(workers.map(async (workerId) => this.getWorkerReport(workerId)))
  }

  /**
   * Get report from a specific worker
   */
  private async getWorkerReport(workerId: string): Promise<WorkerReport> {
    const data = await this.redis.get(`flux_console:worker:${workerId}`)

    if (!data) {
      throw new ZenithError(404, ZenithErrorCodes.WORKER_NOT_FOUND, {
        message: `Worker ${workerId} not found`,
      })
    }

    return JSON.parse(data) as WorkerReport
  }

  /**
   * Check if a key is a system key
   */
  private isSystemKey(key: string): boolean {
    const systemKeys = ['active', 'schedules', 'schedule', 'lock']
    return systemKeys.includes(key)
  }
}
