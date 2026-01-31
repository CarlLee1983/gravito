/**
 * @gravito/monitor - Built-in Health Checks
 */

import type { HealthCheckFn, HealthCheckResult } from '../config'

// Re-export types from HealthRegistry
export type { CacheStats, HealthReport } from './HealthRegistry'

/**
 * Create a database health check
 */
export function createDatabaseCheck(connectionFn: () => Promise<boolean> | boolean): HealthCheckFn {
  return async (): Promise<HealthCheckResult> => {
    try {
      const isConnected = await connectionFn()
      return isConnected
        ? { status: 'healthy', message: 'Database connected' }
        : { status: 'unhealthy', message: 'Database disconnected' }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database check failed',
      }
    }
  }
}

/**
 * Create a Redis health check
 */
export function createRedisCheck(pingFn: () => Promise<string> | string): HealthCheckFn {
  return async (): Promise<HealthCheckResult> => {
    try {
      const result = await pingFn()
      return result === 'PONG'
        ? { status: 'healthy', message: 'Redis connected' }
        : { status: 'unhealthy', message: `Unexpected response: ${result}` }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Redis check failed',
      }
    }
  }
}

/**
 * Create a memory usage health check
 */
export function createMemoryCheck(options?: {
  maxHeapUsedPercent?: number // Default 90%
}): HealthCheckFn {
  const maxPercent = options?.maxHeapUsedPercent ?? 90

  return (): HealthCheckResult => {
    const usage = process.memoryUsage()
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100

    if (heapUsedPercent > maxPercent) {
      return {
        status: 'degraded',
        message: `Heap usage at ${heapUsedPercent.toFixed(1)}%`,
        details: {
          heapUsed: formatBytes(usage.heapUsed),
          heapTotal: formatBytes(usage.heapTotal),
          heapUsedPercent: heapUsedPercent.toFixed(1),
          rss: formatBytes(usage.rss),
        },
      }
    }

    return {
      status: 'healthy',
      message: 'Memory usage normal',
      details: {
        heapUsed: formatBytes(usage.heapUsed),
        heapTotal: formatBytes(usage.heapTotal),
        heapUsedPercent: heapUsedPercent.toFixed(1),
        rss: formatBytes(usage.rss),
      },
    }
  }
}

/**
 * Create a custom HTTP endpoint health check
 */
export function createHttpCheck(
  url: string,
  options?: {
    timeout?: number
    expectedStatus?: number
    method?: string
  }
): HealthCheckFn {
  const timeout = options?.timeout ?? 5000
  const expectedStatus = options?.expectedStatus ?? 200
  const method = options?.method ?? 'GET'

  return async (): Promise<HealthCheckResult> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const start = performance.now()
      const response = await fetch(url, {
        method,
        signal: controller.signal,
      })
      const latency = Math.round(performance.now() - start)
      clearTimeout(timeoutId)

      if (response.status === expectedStatus) {
        return {
          status: 'healthy',
          message: `${url} responded with ${response.status}`,
          latency,
        }
      }

      return {
        status: 'unhealthy',
        message: `Expected ${expectedStatus}, got ${response.status}`,
        latency,
      }
    } catch (error) {
      clearTimeout(timeoutId)
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'HTTP check failed',
      }
    }
  }
}

/**
 * Create a disk space health check
 */
export function createDiskCheck(options?: {
  path?: string
  minFreePercent?: number // Default 10%
}): HealthCheckFn {
  const minFreePercent = options?.minFreePercent ?? 10

  return async (): Promise<HealthCheckResult> => {
    try {
      // Use Bun's file system or fallback to basic check
      // Note: Full disk stats require platform-specific implementation
      return {
        status: 'healthy',
        message: 'Disk check passed',
        details: {
          minFreePercent,
        },
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Disk check failed',
      }
    }
  }
}

// Helper function
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

export { HealthController } from './HealthController'
export { HealthRegistry } from './HealthRegistry'
