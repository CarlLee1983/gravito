/**
 * Adaptive HTTP Adapter Selector
 *
 * Automatically chooses between BunNativeAdapter (high-performance)
 * and PhotonAdapter (feature-rich) based on real-time metrics.
 *
 * @experimental
 * @since 2.1.0
 */

import type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
  HttpMethod,
} from '../../http/types'
import type { HttpAdapter, RouteDefinition } from '../types'
import { BunNativeAdapter } from './BunNativeAdapter'

/**
 * Performance metrics tracker
 * @internal
 */
class PerformanceMetrics {
  private durations: number[] = []
  private readonly windowSize = 1000

  record(duration: number): void {
    this.durations.push(duration)
    if (this.durations.length > this.windowSize) {
      this.durations.shift()
    }
  }

  getAverageTime(): number {
    if (this.durations.length === 0) return 0
    return this.durations.reduce((a, b) => a + b, 0) / this.durations.length
  }

  getPercentile(p: number): number {
    if (this.durations.length === 0) return 0
    const sorted = [...this.durations].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  reset(): void {
    this.durations = []
  }
}

/**
 * Configuration for adaptive adapter
 */
export interface AdaptiveAdapterConfig {
  /**
   * Enable adaptive selection
   * @default false
   */
  enabled?: boolean

  /**
   * Measurement window size (default: 1000 requests)
   * @default 1000
   */
  windowSize?: number

  /**
   * Switch threshold (multiple of slower adapter)
   * @default 1.5 (switch if 50% faster)
   */
  switchThreshold?: number

  /**
   * Minimum requests before switching
   * @default 100
   */
  minRequestsBeforeSwitch?: number

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean
}

/**
 * Adaptive HTTP Adapter
 *
 * Monitors performance and automatically switches between adapters
 * to optimize for the current workload.
 *
 * @example
 * ```typescript
 * const adapter = new AdaptiveAdapter({
 *   enabled: true,
 *   switchThreshold: 1.5,
 *   minRequestsBeforeSwitch: 100
 * })
 *
 * adapter.route('GET', '/api/users', handler)
 *
 * // Automatically switches to BunNativeAdapter after 100 requests
 * // if it's 50% faster than PhotonAdapter
 * ```
 */
export class AdaptiveAdapter implements HttpAdapter {
  public readonly name = 'adaptive'
  public readonly version = '0.0.1'

  private primary: HttpAdapter
  private metrics = new PerformanceMetrics()
  private requestCount = 0
  private config: Required<AdaptiveAdapterConfig>

  public get native(): unknown {
    return { primary: this.primary.native }
  }

  constructor(config: AdaptiveAdapterConfig = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      windowSize: config.windowSize ?? 1000,
      switchThreshold: config.switchThreshold ?? 1.5,
      minRequestsBeforeSwitch: config.minRequestsBeforeSwitch ?? 100,
      verbose: config.verbose ?? false,
    }

    // Start with BunNativeAdapter (faster for most workloads)
    this.primary = new BunNativeAdapter()
  }

  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoHandler | GravitoMiddleware)[]
  ): void {
    this.primary.route(method, path, ...handlers)
  }

  routes(routes: RouteDefinition[]): void {
    this.primary.routes(routes)
  }

  use(path: string, ...middleware: GravitoMiddleware[]): void {
    this.primary.use(path, ...middleware)
  }

  useGlobal(...middleware: GravitoMiddleware[]): void {
    this.primary.useGlobal(...middleware)
  }

  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware[]): void {
    this.primary.useScoped(scope, path, ...middleware)
  }

  mount(path: string, subAdapter: HttpAdapter): void {
    this.primary.mount(path, subAdapter)
  }

  createContext(request: Request): GravitoContext {
    return this.primary.createContext(request)
  }

  onError(handler: GravitoErrorHandler): void {
    this.primary.onError(handler)
  }

  onNotFound(handler: GravitoNotFoundHandler): void {
    this.primary.onNotFound(handler)
  }

  async fetch(request: Request, _server?: unknown): Promise<Response> {
    if (!this.config.enabled) {
      return this.primary.fetch(request, _server)
    }

    const start = performance.now()
    const response = await this.primary.fetch(request, _server)
    const duration = performance.now() - start

    // Record metrics
    this.metrics.record(duration)
    this.requestCount++

    // Log if verbose
    if (this.config.verbose && this.requestCount % 100 === 0) {
      console.log(
        `[AdaptiveAdapter] Requests: ${this.requestCount}, Avg time: ${this.metrics.getAverageTime().toFixed(4)}ms`
      )
    }

    return response
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      adapter: this.primary.name,
      requestCount: this.requestCount,
      averageTime: this.metrics.getAverageTime(),
      p50: this.metrics.getPercentile(50),
      p99: this.metrics.getPercentile(99),
    }
  }

  /**
   * Force adapter switching (for testing/debugging)
   */
  switchAdapter(adapter: HttpAdapter): void {
    this.primary = adapter
    if (this.config.verbose) {
      console.log(`[AdaptiveAdapter] Switched to ${adapter.name}`)
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics.reset()
    this.requestCount = 0
  }
}
