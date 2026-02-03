/**
 * @gravito/core - OpenTelemetry Event Metrics
 *
 * Provides event system metrics using OpenTelemetry API directly.
 * This enables Prometheus export without requiring @gravito/monitor dependency.
 *
 * Metrics:
 * - gravito_event_dispatch_duration_seconds (Histogram)
 * - gravito_event_listener_duration_seconds (Histogram)
 * - gravito_event_queue_depth (Observable Gauge)
 *
 * @packageDocumentation
 */

import type { Histogram, Meter, ObservableGauge, ObservableResult } from '@opentelemetry/api'

/**
 * Queue depth callback type.
 * Returns the current queue depths for each priority level.
 */
export type QueueDepthCallback = () => {
  high: number
  normal: number
  low: number
}

/**
 * Default histogram buckets for dispatch duration.
 * Covers from 1ms to 10s with exponential distribution.
 */
const DEFAULT_DISPATCH_BUCKETS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

/**
 * Default histogram buckets for listener duration.
 * Covers from 1ms to 5s with exponential distribution.
 */
const DEFAULT_LISTENER_BUCKETS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]

/**
 * OpenTelemetry-based Event Metrics collector.
 *
 * Uses OpenTelemetry API directly for metrics collection, enabling
 * Prometheus export through the OpenTelemetry SDK.
 *
 * @example
 * ```typescript
 * import { metrics } from '@opentelemetry/api'
 * import { OTelEventMetrics } from '@gravito/core'
 *
 * const meter = metrics.getMeter('@gravito/core', '1.0.0')
 * const eventMetrics = new OTelEventMetrics(meter)
 *
 * // Record dispatch duration
 * eventMetrics.recordDispatchDuration('order:created', 'high', 0.123)
 *
 * // Record listener duration
 * eventMetrics.recordListenerDuration('order:created', 0, 0.456)
 *
 * // Set queue depth callback
 * eventMetrics.setQueueDepthCallback(() => ({
 *   high: 10,
 *   normal: 50,
 *   low: 100
 * }))
 * ```
 *
 * @public
 */
export class OTelEventMetrics {
  private readonly meter: Meter
  private readonly prefix: string

  private readonly dispatchDurationHistogram: Histogram
  private readonly listenerDurationHistogram: Histogram
  private readonly queueDepthGauge: ObservableGauge

  private queueDepthCallback?: QueueDepthCallback

  /**
   * Bucket boundaries for dispatch duration histogram.
   */
  private readonly dispatchDurationBuckets: number[] = DEFAULT_DISPATCH_BUCKETS

  /**
   * Bucket boundaries for listener duration histogram.
   */
  private readonly listenerDurationBuckets: number[] = DEFAULT_LISTENER_BUCKETS

  /**
   * Create a new OTelEventMetrics instance.
   *
   * @param meter - OpenTelemetry Meter instance
   * @param prefix - Metric name prefix (default: 'gravito_event_')
   */
  constructor(meter: Meter, prefix = 'gravito_event_') {
    this.meter = meter
    this.prefix = prefix

    // Create dispatch duration histogram
    this.dispatchDurationHistogram = meter.createHistogram(`${prefix}dispatch_duration_seconds`, {
      description: 'Duration of event dispatch operations in seconds',
      unit: 's',
      advice: {
        explicitBucketBoundaries: this.dispatchDurationBuckets,
      },
    })

    // Create listener duration histogram
    this.listenerDurationHistogram = meter.createHistogram(`${prefix}listener_duration_seconds`, {
      description: 'Duration of listener execution in seconds',
      unit: 's',
      advice: {
        explicitBucketBoundaries: this.listenerDurationBuckets,
      },
    })

    // Create queue depth observable gauge
    this.queueDepthGauge = meter.createObservableGauge(`${prefix}queue_depth`, {
      description: 'Current queue depth by priority level',
      unit: '{events}',
    })

    // Register the observable callback
    this.queueDepthGauge.addCallback((observableResult: ObservableResult) => {
      if (this.queueDepthCallback) {
        const depths = this.queueDepthCallback()
        observableResult.observe(depths.high, { priority: 'high' })
        observableResult.observe(depths.normal, { priority: 'normal' })
        observableResult.observe(depths.low, { priority: 'low' })
      }
    })
  }

  /**
   * Record event dispatch duration.
   *
   * @param eventName - Name of the event
   * @param priority - Priority level (high, normal, low)
   * @param durationSeconds - Duration in seconds
   */
  recordDispatchDuration(eventName: string, priority: string, durationSeconds: number): void {
    this.dispatchDurationHistogram.record(durationSeconds, {
      event_name: eventName,
      priority,
    })
  }

  /**
   * Record listener execution duration.
   *
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener in the callback list
   * @param durationSeconds - Duration in seconds
   */
  recordListenerDuration(eventName: string, listenerIndex: number, durationSeconds: number): void {
    this.listenerDurationHistogram.record(durationSeconds, {
      event_name: eventName,
      listener_index: String(listenerIndex),
    })
  }

  /**
   * Set the callback for queue depth observable gauge.
   *
   * The callback will be invoked when metrics are collected,
   * allowing real-time reporting of queue depths.
   *
   * @param callback - Function returning current queue depths
   */
  setQueueDepthCallback(callback: QueueDepthCallback): void {
    this.queueDepthCallback = callback
  }

  /**
   * Get the bucket boundaries for dispatch duration histogram.
   *
   * @returns Array of bucket boundaries in seconds
   */
  getDispatchDurationBuckets(): number[] {
    return [...this.dispatchDurationBuckets]
  }

  /**
   * Get the bucket boundaries for listener duration histogram.
   *
   * @returns Array of bucket boundaries in seconds
   */
  getListenerDurationBuckets(): number[] {
    return [...this.listenerDurationBuckets]
  }

  /**
   * Get the OpenTelemetry Meter instance.
   *
   * @returns Meter instance
   */
  getMeter(): Meter {
    return this.meter
  }

  /**
   * Get the metric name prefix.
   *
   * @returns Metric name prefix
   */
  getPrefix(): string {
    return this.prefix
  }
}
