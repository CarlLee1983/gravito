/**
 * @gravito/monitor - Health Check Registry
 *
 * Manages health check registrations and executions
 */

import type { HealthCheckFn, HealthCheckResult, HealthConfig } from '../config'

/**
 * Aggregated health check report.
 * @public
 */
export interface HealthReport {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  checks: Record<string, HealthCheckResult & { name: string }>
}

const DEFAULTS = {
  timeout: 5000,
  cacheTtl: 0,
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
}

/**
 * HealthRegistry manages all health checks
 */
export class HealthRegistry {
  private checks = new Map<string, HealthCheckFn>()
  private startTime = Date.now()
  private cachedReport: HealthReport | null = null
  private cacheExpiry = 0
  private timeout: number
  private cacheTtl: number
  private cacheHits = 0
  private cacheMisses = 0

  constructor(config: HealthConfig = {}) {
    this.timeout = config.timeout ?? DEFAULTS.timeout
    this.cacheTtl = config.cacheTtl ?? DEFAULTS.cacheTtl
  }

  /**
   * Register a health check
   */
  register(name: string, check: HealthCheckFn): this {
    this.checks.set(name, check)
    return this
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): boolean {
    return this.checks.delete(name)
  }

  /**
   * Get all registered check names
   */
  getCheckNames(): string[] {
    return Array.from(this.checks.keys())
  }

  /**
   * Execute a single health check with timeout
   */
  private async executeCheck(
    name: string,
    check: HealthCheckFn
  ): Promise<HealthCheckResult & { name: string }> {
    const start = performance.now()

    try {
      const result = await Promise.race([
        Promise.resolve(check()),
        new Promise<HealthCheckResult>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), this.timeout)
        ),
      ])

      const latency = Math.round(performance.now() - start)

      return {
        name,
        ...result,
        latency,
      }
    } catch (error) {
      const latency = Math.round(performance.now() - start)
      const message = error instanceof Error ? error.message : 'Unknown error'

      return {
        name,
        status: 'unhealthy',
        message,
        latency,
      }
    }
  }

  /**
   * Execute all health checks and generate report
   */
  async check(): Promise<HealthReport> {
    // Return cached report if valid
    if (this.cacheTtl > 0 && this.cachedReport && Date.now() < this.cacheExpiry) {
      this.cacheHits++
      return this.cachedReport
    }

    this.cacheMisses++

    const results = await Promise.all(
      Array.from(this.checks.entries()).map(([name, check]) => this.executeCheck(name, check))
    )

    const checks: Record<string, HealthCheckResult & { name: string }> = {}
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

    for (const result of results) {
      checks[result.name] = result

      if (result.status === 'unhealthy') {
        overallStatus = 'unhealthy'
      } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
        overallStatus = 'degraded'
      }
    }

    const report: HealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      checks,
    }

    // Cache if enabled
    if (this.cacheTtl > 0) {
      this.cachedReport = report
      this.cacheExpiry = Date.now() + this.cacheTtl
    }

    return report
  }

  /**
   * Simple liveness check (is the process running?)
   */
  async liveness(): Promise<{ status: 'healthy' | 'unhealthy' }> {
    return { status: 'healthy' }
  }

  /**
   * Readiness check (is the app ready to serve traffic?)
   * By default, requires all checks to be healthy
   */
  async readiness(): Promise<{ status: 'healthy' | 'unhealthy'; reason?: string }> {
    if (this.checks.size === 0) {
      return { status: 'healthy' }
    }

    const report = await this.check()

    if (report.status === 'unhealthy') {
      const failedChecks = Object.entries(report.checks)
        .filter(([_, r]) => r.status === 'unhealthy')
        .map(([name]) => name)

      return {
        status: 'unhealthy',
        reason: `Failed checks: ${failedChecks.join(', ')}`,
      }
    }

    return { status: 'healthy' }
  }

  /**
   * Get cache statistics
   *
   * Useful for monitoring cache effectiveness and tuning cacheTtl
   */
  getCacheStats(): CacheStats {
    const total = this.cacheHits + this.cacheMisses
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    }
  }
}
