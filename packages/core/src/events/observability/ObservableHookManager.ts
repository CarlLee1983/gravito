/**
 * @gravito/core - Observable Hook Manager
 *
 * Wraps HookManager with observability support (metrics and tracing).
 */

import { HookManager, type HookManagerConfig } from '../../HookManager'
import type { EventOptions } from '../EventOptions'
import type { EventTask } from '../types'
import { EventMetrics } from './EventMetrics'
import { EventTracer } from './EventTracer'

/**
 * Configuration for observability features.
 * @public
 */
export interface ObservabilityConfig {
  /**
   * Enable observability features.
   * @default false
   */
  enabled?: boolean

  /**
   * MetricsRegistry instance from @gravito/monitor.
   * Required if metrics collection is enabled.
   */
  metrics?: any

  /**
   * Enable OpenTelemetry distributed tracing.
   * @default false
   */
  tracing?: boolean

  /**
   * Prefix for metric names.
   * @default 'gravito_event_'
   */
  metricsPrefix?: string
}

/**
 * Observable Hook Manager - extends HookManager with observability.
 *
 * Provides metrics and distributed tracing for event dispatch and listener execution.
 * Maintains 100% backward compatibility with HookManager.
 *
 * @public
 */
export class ObservableHookManager extends HookManager {
  private eventMetrics?: EventMetrics
  private eventTracer?: EventTracer
  private obsConfig: ObservabilityConfig

  /**
   * Create a new ObservableHookManager instance.
   *
   * @param config - HookManager configuration
   * @param obsConfig - Observability configuration
   */
  constructor(config: HookManagerConfig = {}, obsConfig: ObservabilityConfig = {}) {
    super(config)
    this.obsConfig = obsConfig

    // Initialize metrics if enabled and registry is provided
    if (obsConfig.enabled && obsConfig.metrics) {
      this.eventMetrics = new EventMetrics(obsConfig.metrics, obsConfig.metricsPrefix)
    }

    // Initialize tracer if enabled
    if (obsConfig.enabled && obsConfig.tracing) {
      this.eventTracer = new EventTracer()
    }
  }

  /**
   * Run all registered actions asynchronously via priority queue with observability.
   *
   * This override adds metrics and tracing to the base implementation.
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   * @param options - Event options for async dispatch.
   */
  async doActionAsync<TArgs = unknown>(
    hook: string,
    args: TArgs,
    options: EventOptions = {}
  ): Promise<void> {
    // If observability is disabled, use parent implementation directly
    if (!this.obsConfig.enabled) {
      return super.doActionAsync(hook, args, options)
    }

    const startTime = performance.now()
    const priority = options.priority || 'normal'
    const callbacks = this.getListeners(hook)

    let span: any
    if (this.eventTracer) {
      span = this.eventTracer.startDispatchSpan(hook, callbacks.length, priority)
    }

    try {
      // Call parent implementation
      await super.doActionAsync(hook, args, options)

      // Record metrics for successful dispatch
      if (this.eventMetrics) {
        const duration = (performance.now() - startTime) / 1000
        this.eventMetrics.recordDispatchLatency(hook, priority, duration)
        this.eventMetrics.recordProcessed(hook, 'success')

        // Update queue depth for this priority
        const queueDepth = this.getQueueDepthByPriority(priority as 'high' | 'normal' | 'low')
        this.eventMetrics.updateQueueDepth(priority, queueDepth)
      }

      // Set span status to OK
      if (span && this.eventTracer) {
        this.eventTracer.endSpan(span, 'ok')
      }
    } catch (error) {
      // Record metrics for failed dispatch
      if (this.eventMetrics) {
        const errorName = error instanceof Error ? error.constructor.name : 'Unknown'
        this.eventMetrics.recordFailure(hook, errorName)
        this.eventMetrics.recordProcessed(hook, 'failure')
      }

      // Record error in span
      if (span && this.eventTracer && error instanceof Error) {
        this.eventTracer.recordError(span, error)
        this.eventTracer.endSpan(span, 'error')
      }

      throw error
    }
  }

  /**
   * Get the EventMetrics instance.
   *
   * @returns EventMetrics instance if observability is enabled, undefined otherwise
   */
  getMetrics(): EventMetrics | undefined {
    return this.eventMetrics
  }

  /**
   * Get the EventTracer instance.
   *
   * @returns EventTracer instance if tracing is enabled, undefined otherwise
   */
  getTracer(): EventTracer | undefined {
    return this.eventTracer
  }

  /**
   * Update observability configuration at runtime.
   *
   * @param config - New observability configuration
   */
  setObservabilityConfig(config: Partial<ObservabilityConfig>): void {
    this.obsConfig = {
      ...this.obsConfig,
      ...config,
    }

    // Reinitialize metrics if enabled and registry is provided
    if (this.obsConfig.enabled && this.obsConfig.metrics && !this.eventMetrics) {
      this.eventMetrics = new EventMetrics(this.obsConfig.metrics, this.obsConfig.metricsPrefix)
    }

    // Reinitialize tracer if enabled
    if (this.obsConfig.enabled && this.obsConfig.tracing && !this.eventTracer) {
      this.eventTracer = new EventTracer()
    }
  }

  /**
   * Get current observability configuration.
   *
   * @returns Current observability configuration
   */
  getObservabilityConfig(): ObservabilityConfig {
    return { ...this.obsConfig }
  }
}
