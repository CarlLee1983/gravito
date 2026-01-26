import type { Probe, SystemMetrics } from './types'

export class CachedNodeProbe implements Probe {
  private cache?: { metrics: SystemMetrics; timestamp: number }
  private cacheTimeout: number

  constructor(
    private wrappedProbe: Probe,
    options: { cacheTimeout?: number } = {}
  ) {
    this.cacheTimeout = options.cacheTimeout ?? 1000
  }

  async getMetrics(): Promise<SystemMetrics> {
    const now = Date.now()

    if (this.cache && now - this.cache.timestamp < this.cacheTimeout) {
      return this.cache.metrics
    }

    const metrics = await this.wrappedProbe.getMetrics()
    this.cache = { metrics, timestamp: now }
    return metrics
  }
}
