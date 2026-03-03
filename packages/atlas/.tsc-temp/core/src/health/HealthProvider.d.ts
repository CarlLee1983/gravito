/**
 * @fileoverview HealthProvider - Cloud-native health checks
 *
 * Provides liveness and readiness probes for Kubernetes and cloud deployments
 *
 * @module @gravito/core/health
 * @since 2.2.0
 */
import type { Container } from '../Container'
import type { PlanetCore } from '../PlanetCore'
import { ServiceProvider } from '../ServiceProvider'
/**
 * Health check result
 * @public
 */
export interface HealthCheckResult {
  /** Health status */
  status: 'healthy' | 'unhealthy'
  /** Optional message */
  message?: string
}
/**
 * Health check function interface
 * @public
 */
export interface HealthCheck {
  /** Unique name for this check */
  name: string
  /** Check function that returns health status */
  check(): Promise<HealthCheckResult>
}
/**
 * HealthProvider - Provides /health/liveness and /health/readiness endpoints
 *
 * - Liveness: Always returns 200 OK (just checks if server is running)
 * - Readiness: Returns 200 if all checks are healthy, 503 otherwise
 *
 * @public
 */
export declare class HealthProvider extends ServiceProvider {
  private checks
  register(container: Container): void
  /**
   * Register a health check
   *
   * @param check - The health check to register
   *
   * @example
   * ```typescript
   * const health = core.container.make<HealthProvider>('health')
   * health.registerCheck({
   *   name: 'database',
   *   check: async () => {
   *     try {
   *       await db.ping()
   *       return { status: 'healthy' }
   *     } catch {
   *       return { status: 'unhealthy', message: 'DB unreachable' }
   *     }
   *   }
   * })
   * ```
   */
  registerCheck(check: HealthCheck): void
  boot(core: PlanetCore): void
}
export default HealthProvider
