import type { Redis } from 'ioredis'

export interface AggregatedMetrics {
  queue: string
  period: '1m' | '5m' | '15m'
  throughput: {
    in: number
    out: number
  }
  errorRate: number
}

export class MetricsAggregator {
  constructor(
    private redis: Redis,
    private prefix = 'flux_console:'
  ) {}

  async aggregate(queueName: string, periodMinutes = 1): Promise<AggregatedMetrics> {
    const historyKey = `${this.prefix}logs:history`
    const logs = await this.redis.lrange(historyKey, 0, -1)

    const now = Date.now()
    const periodMs = periodMinutes * 60 * 1000
    const cutoff = now - periodMs

    let completedCount = 0
    let failedCount = 0
    let totalCount = 0

    for (const logStr of logs) {
      try {
        const log = JSON.parse(logStr)
        const logTime = new Date(log.timestamp).getTime()

        if (logTime < cutoff) continue

        const logQueue = log.context?.queue || log.queue
        if (logQueue !== queueName) continue

        if (log.level === 'success' || (log.context && log.context.event === 'job_completed')) {
          completedCount++
          totalCount++
        } else if (log.level === 'error' || (log.context && log.context.event === 'job_failed')) {
          failedCount++
          totalCount++
        }
      } catch {}
    }

    const throughputIn = totalCount / periodMinutes
    const throughputOut = completedCount / periodMinutes
    const errorRate = totalCount > 0 ? failedCount / totalCount : 0

    return {
      queue: queueName,
      period: `${periodMinutes}m` as any,
      throughput: {
        in: throughputIn,
        out: throughputOut,
      },
      errorRate,
    }
  }
}
