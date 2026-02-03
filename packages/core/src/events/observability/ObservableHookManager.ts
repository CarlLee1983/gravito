/**
 * @gravito/core - Observable Hook Manager
 *
 * Wraps HookManager with observability support (metrics and tracing).
 */

import { HookManager, type HookManagerConfig } from '../../HookManager'
import type { EventOptions } from '../EventOptions'
import { EventMetrics } from './EventMetrics'
import { EventTracer } from './EventTracer'
import { EventTracing } from './EventTracing'

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
  private eventTracing?: EventTracing
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

      // Set EventMetrics on the event queue so circuit breakers can record metrics
      this.getEventQueue().setEventMetrics(this.eventMetrics)
    }

    // Initialize tracer if enabled
    if (obsConfig.enabled && obsConfig.tracing) {
      this.eventTracer = new EventTracer()
      this.eventTracing = new EventTracing()

      // Set EventTracing on the event queue so it can create listener spans
      this.getEventQueue().setEventTracing(this.eventTracing)
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

    // Create dispatch span using EventTracing (preferred) or EventTracer (fallback)
    let span: any
    if (this.eventTracing) {
      span = this.eventTracing.startDispatchSpan(
        hook,
        callbacks.length,
        priority as 'high' | 'normal' | 'low'
      )
      // Set the dispatch span on the queue for child span creation
      this.getEventQueue().setCurrentDispatchSpan(span)
    } else if (this.eventTracer) {
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
      if (span && this.eventTracing) {
        this.eventTracing.endDispatchSpan(span, 'ok')
      } else if (span && this.eventTracer) {
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
      if (span && this.eventTracing && error instanceof Error) {
        this.eventTracing.endDispatchSpan(span, 'error', error)
      } else if (span && this.eventTracer && error instanceof Error) {
        this.eventTracer.recordError(span, error)
        this.eventTracer.endSpan(span, 'error')
      }

      throw error
    } finally {
      // Clear the dispatch span from the queue
      if (this.eventTracing) {
        this.getEventQueue().setCurrentDispatchSpan(undefined)
      }
    }
  }

  /**
   * Run all registered actions synchronously with observability.
   *
   * This override adds metrics and tracing to the base implementation.
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   */
  async doActionSync<TArgs = unknown>(hook: string, args: TArgs): Promise<void> {
    // If observability is disabled, use parent implementation directly
    if (!this.obsConfig.enabled) {
      return super.doActionSync(hook, args)
    }

    const startTime = performance.now()
    const callbacks = this.getListeners(hook)

    // Create dispatch span using EventTracing (preferred) or EventTracer (fallback)
    let span: any
    if (this.eventTracing) {
      span = this.eventTracing.startDispatchSpan(hook, callbacks.length, 'normal')
      // Add sync dispatch mode attribute
      span.setAttributes({ 'event.dispatch_mode': 'sync' })
    } else if (this.eventTracer) {
      span = this.eventTracer.startDispatchSpan(hook, callbacks.length, 'normal')
    }

    let hasError = false
    let lastError: Error | undefined

    try {
      // Call parent implementation
      await super.doActionSync(hook, args)
    } catch (error) {
      // Note: doActionSync catches errors internally, so this is unlikely to be reached
      // But we handle it for completeness
      hasError = true
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    // Calculate duration
    const duration = (performance.now() - startTime) / 1000

    // Record metrics for sync dispatch
    if (this.eventMetrics) {
      this.eventMetrics.recordDispatchLatency(hook, 'normal', duration)
      this.eventMetrics.recordProcessed(hook, hasError ? 'failure' : 'success')

      if (hasError && lastError) {
        this.eventMetrics.recordFailure(hook, lastError.constructor.name)
      }
    }

    // End span
    if (span && this.eventTracing) {
      if (hasError && lastError) {
        this.eventTracing.endDispatchSpan(span, 'error', lastError)
      } else {
        this.eventTracing.endDispatchSpan(span, 'ok')
      }
    } else if (span && this.eventTracer) {
      if (hasError && lastError) {
        this.eventTracer.recordError(span, lastError)
        this.eventTracer.endSpan(span, 'error')
      } else {
        this.eventTracer.endSpan(span, 'ok')
      }
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

      // Set EventMetrics on the event queue so circuit breakers can record metrics
      this.getEventQueue().setEventMetrics(this.eventMetrics)
    }

    // Reinitialize tracer if enabled
    if (this.obsConfig.enabled && this.obsConfig.tracing && !this.eventTracer) {
      this.eventTracer = new EventTracer()
      this.eventTracing = new EventTracing()

      // Set EventTracing on the event queue so it can create listener spans
      this.getEventQueue().setEventTracing(this.eventTracing)
    }
  }

  /**
   * Get the EventTracing instance.
   *
   * @returns EventTracing instance if tracing is enabled, undefined otherwise
   */
  getEventTracing(): EventTracing | undefined {
    return this.eventTracing
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
