/**
 * @gravito/monitor - Observability Adapter
 *
 * Provides concrete OpenTelemetry-based implementations of observability providers.
 * These adapters can be passed to @gravito/core to enable metrics, tracing, and monitoring.
 *
 * @packageDocumentation
 */

import type {
  EventMetricsRecorder,
  EventTracingProvider,
  ObservabilityProvider,
  TracingSpan,
  WorkerMetricsProvider,
} from '@gravito/core'
import { getMeter, getOpenTelemetrySDK, getTracer } from '../opentelemetry'

/**
 * OpenTelemetry-based event metrics recorder.
 * Records event processing metrics using OTel Meter.
 * @internal
 */
class OTelEventMetricsRecorder implements EventMetricsRecorder {
  private eventProcessedCounter: any
  private eventPublishedCounter: any
  private eventErrorCounter: any
  private processingDurationHistogram: any

  constructor(meter: any) {
    this.eventProcessedCounter = meter.createCounter('gravito.event.processed', {
      description: 'Number of events processed',
    })
    this.eventPublishedCounter = meter.createCounter('gravito.event.published', {
      description: 'Number of events published',
    })
    this.eventErrorCounter = meter.createCounter('gravito.event.errors', {
      description: 'Number of event processing errors',
    })
    this.processingDurationHistogram = meter.createHistogram('gravito.event.duration', {
      description: 'Event processing duration in seconds',
      unit: 's',
    })
  }

  recordEventProcessed(eventName: string, duration: number, success: boolean): void {
    this.eventProcessedCounter.add(1, {
      event_name: eventName,
      success: success.toString(),
    })
    this.processingDurationHistogram.record(duration / 1000, {
      event_name: eventName,
    })
  }

  recordEventPublished(eventName: string): void {
    this.eventPublishedCounter.add(1, {
      event_name: eventName,
    })
  }

  recordEventError(eventName: string, error: Error): void {
    this.eventErrorCounter.add(1, {
      event_name: eventName,
      error_type: error.constructor.name,
    })
  }
}

/**
 * Wrapper for OTel Span to match core's TracingSpan interface.
 * @internal
 */
class OTelSpanWrapper implements TracingSpan {
  constructor(private span: any) {}

  addEvent(name: string, attributes?: Record<string, string | number>): void {
    this.span.addEvent(name, attributes)
  }

  setStatus(code: 'OK' | 'ERROR', message?: string): void {
    this.span.setStatus({
      code: code === 'OK' ? 0 : 2, // SpanStatusCode.OK = 0, SpanStatusCode.ERROR = 2
      message,
    })
  }

  end(): void {
    this.span.end()
  }
}

/**
 * OpenTelemetry-based event tracing provider.
 * Provides distributed tracing for events using OTel Tracer.
 * @internal
 */
class OTelEventTracingProvider implements EventTracingProvider {
  private tracer: any

  constructor(tracer: any) {
    this.tracer = tracer
  }

  startSpan(name: string): TracingSpan {
    const span = this.tracer.startSpan(name)
    return new OTelSpanWrapper(span)
  }

  recordMetrics(_eventName: string, _metrics: Record<string, number>): void {
    // Metrics recording implementation
    // This would be coordinated with the OTelEventMetricsRecorder
  }
}

/**
 * OpenTelemetry-based worker metrics provider.
 * Records worker pool operations and metrics.
 * @internal
 */
class OTelWorkerMetricsProvider implements WorkerMetricsProvider {
  private workerStartupCounter: any
  private taskExecutionHistogram: any
  private workerErrorCounter: any

  constructor(meter: any) {
    this.workerStartupCounter = meter.createCounter('gravito.worker.startup', {
      description: 'Number of worker pool startups',
    })
    this.taskExecutionHistogram = meter.createHistogram('gravito.worker.task.duration', {
      description: 'Worker task execution duration in seconds',
      unit: 's',
    })
    this.workerErrorCounter = meter.createCounter('gravito.worker.errors', {
      description: 'Number of worker pool errors',
    })
  }

  recordWorkerStartup(poolId: string): void {
    this.workerStartupCounter.add(1, { pool_id: poolId })
  }

  recordTaskExecution(poolId: string, duration: number, success: boolean): void {
    this.taskExecutionHistogram.record(duration / 1000, {
      pool_id: poolId,
      success: success.toString(),
    })
  }

  recordWorkerError(poolId: string, error: Error): void {
    this.workerErrorCounter.add(1, {
      pool_id: poolId,
      error_type: error.constructor.name,
    })
  }
}

/**
 * Factory for creating OpenTelemetry-based observability providers.
 * This is the main integration point between @gravito/core and @gravito/monitor.
 */
export class ObservabilityAdapterFactory {
  /**
   * Create an observability provider with OpenTelemetry instrumentation.
   *
   * @param options - Configuration options
   * @returns An ObservabilityProvider instance
   *
   * @example
   * ```typescript
   * import { ObservabilityAdapterFactory } from '@gravito/monitor'
   * import { PlanetCore } from '@gravito/core'
   *
   * const factory = new ObservabilityAdapterFactory()
   * const provider = await factory.createProvider()
   *
   * const core = new PlanetCore({
   *   observabilityProvider: provider
   * })
   * ```
   */
  async createProvider(options?: {
    includeMetrics?: boolean
    includeTracing?: boolean
  }): Promise<ObservabilityProvider> {
    const { includeMetrics = true, includeTracing = true } = options ?? {}

    // Ensure OTel is initialized
    const sdk = getOpenTelemetrySDK()
    if (!sdk) {
      throw new Error(
        'OpenTelemetry SDK not initialized. Call setupOpenTelemetry() first or use monitor.start()'
      )
    }

    const provider: ObservabilityProvider = {}

    if (includeMetrics) {
      const meter = await getMeter('@gravito/core')
      provider.eventMetrics = new OTelEventMetricsRecorder(meter)
      provider.workerMetrics = new OTelWorkerMetricsProvider(meter)
    }

    if (includeTracing) {
      const tracer = await getTracer('@gravito/core')
      provider.eventTracing = new OTelEventTracingProvider(tracer)
      provider.tracing = {
        startSpan: (name: string) => {
          const span = tracer.startSpan(name)
          return new OTelSpanWrapper(span)
        },
      }
    }

    return provider
  }
}

/**
 * Convenience function to create an observability provider.
 */
export async function createObservabilityProvider(
  options?: Parameters<ObservabilityAdapterFactory['createProvider']>[0]
): Promise<ObservabilityProvider> {
  const factory = new ObservabilityAdapterFactory()
  return factory.createProvider(options)
}
