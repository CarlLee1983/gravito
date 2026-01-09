/**
 * @gravito/monitor - MonitorOrbit Plugin
 *
 * Gravito Orbit plugin for observability (Health, Metrics, Tracing)
 */

import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import type { MonitorConfig } from './config'
import { HealthController, HealthRegistry } from './health'
import { MetricsController, MetricsRegistry } from './metrics'
import { TracingManager } from './tracing'

const DEFAULTS = {
  health: {
    enabled: true,
    path: '/health',
    readyPath: '/ready',
    livePath: '/live',
  },
  metrics: {
    enabled: true,
    path: '/metrics',
  },
  tracing: {
    enabled: false,
  },
}

/**
 * Monitor service container
 */
export interface MonitorService {
  health: HealthRegistry
  metrics: MetricsRegistry
  tracing: TracingManager
}

/**
 * MonitorOrbit - Observability plugin for Gravito
 */
export class MonitorOrbit implements GravitoOrbit {
  readonly name = 'monitor'
  private userConfig: MonitorConfig
  private healthRegistry: HealthRegistry | null = null
  private metricsRegistry: MetricsRegistry | null = null
  private tracingManager: TracingManager | null = null

  constructor(config: MonitorConfig = {}) {
    this.userConfig = config
  }

  /**
   * Install the orbit (required by GravitoOrbit interface)
   */
  async install(core: PlanetCore): Promise<void> {
    // Resolve booleans with explicit defaults
    const healthEnabled =
      this.userConfig.health?.enabled !== undefined
        ? this.userConfig.health.enabled
        : DEFAULTS.health.enabled
    const metricsEnabled =
      this.userConfig.metrics?.enabled !== undefined
        ? this.userConfig.metrics.enabled
        : DEFAULTS.metrics.enabled
    const tracingEnabled =
      this.userConfig.tracing?.enabled !== undefined
        ? this.userConfig.tracing.enabled
        : DEFAULTS.tracing.enabled

    // Resolve paths with fallback
    const healthPath = this.userConfig.health?.path || DEFAULTS.health.path
    const readyPath = this.userConfig.health?.readyPath || DEFAULTS.health.readyPath
    const livePath = this.userConfig.health?.livePath || DEFAULTS.health.livePath
    const metricsPath = this.userConfig.metrics?.path || DEFAULTS.metrics.path

    // Initialize registries
    this.healthRegistry = new HealthRegistry(this.userConfig.health)
    this.metricsRegistry = new MetricsRegistry(this.userConfig.metrics)
    this.tracingManager = new TracingManager(this.userConfig.tracing)

    if (tracingEnabled) {
      await this.tracingManager.initialize()
    }

    // Register service container
    const monitorService: MonitorService = {
      health: this.healthRegistry,
      metrics: this.metricsRegistry,
      tracing: this.tracingManager,
    }

    core.services.set('monitor', monitorService)
    core.services.set('health', this.healthRegistry)
    core.services.set('metrics', this.metricsRegistry)
    core.services.set('tracing', this.tracingManager)

    // Register routes
    const router = core.router

    if (healthEnabled && this.healthRegistry) {
      const healthController = new HealthController(this.healthRegistry)
      router.get(healthPath, (c) => healthController.health(c))
      router.get(readyPath, (c) => healthController.ready(c))
      router.get(livePath, (c) => healthController.live(c))
      console.log(`[Monitor] Health endpoints: ${healthPath}, ${readyPath}, ${livePath}`)
    }

    if (metricsEnabled && this.metricsRegistry) {
      const metricsController = new MetricsController(this.metricsRegistry)
      router.get(metricsPath, (c) => metricsController.metrics(c))
      console.log(`[Monitor] Metrics endpoint: ${metricsPath}`)
    }

    console.log('[Monitor] Observability services initialized')
  }

  /**
   * Shutdown hook
   */
  async shutdown(): Promise<void> {
    if (this.tracingManager) {
      await this.tracingManager.shutdown()
    }
  }
}
