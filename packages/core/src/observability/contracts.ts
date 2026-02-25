/**
 * @gravito/core - Observability Contracts
 *
 * Abstract interfaces for observability providers, decoupling core from OpenTelemetry.
 * This allows @gravito/monitor to provide complete OTel implementations while core
 * remains dependency-free.
 */

/**
 * Represents a tracing span for distributed tracing.
 * @public
 */
export interface TracingSpan {
  /**
   * Add an event to the span.
   *
   * @param name - Event name
   * @param attributes - Optional event attributes
   */
  addEvent(name: string, attributes?: Record<string, string | number>): void

  /**
   * Set the span status.
   *
   * @param code - Status code: 'OK' or 'ERROR'
   * @param message - Optional error message
   */
  setStatus(code: 'OK' | 'ERROR', message?: string): void

  /**
   * End the span.
   */
  end(): void
}

/**
 * Event tracing provider for distributed tracing of events.
 * @public
 */
export interface EventTracingProvider {
  /**
   * Start a new tracing span for an event.
   *
   * @param name - Span name
   * @returns A TracingSpan instance
   */
  startSpan(name: string): TracingSpan

  /**
   * Record custom metrics for an event.
   *
   * @param eventName - Name of the event
   * @param metrics - Metrics to record (e.g., duration, count)
   */
  recordMetrics(eventName: string, metrics: Record<string, number>): void
}

/**
 * Event metrics recorder for monitoring event processing.
 * @public
 */
export interface EventMetricsRecorder {
  /**
   * Record event processing completion.
   *
   * @param eventName - Name of the event
   * @param duration - Processing duration in milliseconds
   * @param success - Whether processing was successful
   */
  recordEventProcessed(eventName: string, duration: number, success: boolean): void

  /**
   * Record event publication.
   *
   * @param eventName - Name of the event
   */
  recordEventPublished(eventName: string): void

  /**
   * Record event processing error.
   *
   * @param eventName - Name of the event
   * @param error - The error that occurred
   */
  recordEventError(eventName: string, error: Error): void
}

/**
 * Worker metrics provider for monitoring worker pool operations.
 * @public
 */
export interface WorkerMetricsProvider {
  /**
   * Record worker pool startup.
   *
   * @param poolId - ID of the worker pool
   */
  recordWorkerStartup(poolId: string): void

  /**
   * Record task execution in a worker pool.
   *
   * @param poolId - ID of the worker pool
   * @param duration - Task duration in milliseconds
   * @param success - Whether task execution was successful
   */
  recordTaskExecution(poolId: string, duration: number, success: boolean): void

  /**
   * Record worker pool error.
   *
   * @param poolId - ID of the worker pool
   * @param error - The error that occurred
   */
  recordWorkerError(poolId: string, error: Error): void
}

/**
 * Main observability provider interface combining all observability capabilities.
 * @public
 */
export interface ObservabilityProvider {
  /**
   * Event tracing provider (optional).
   */
  eventTracing?: EventTracingProvider

  /**
   * Event metrics recorder (optional).
   */
  eventMetrics?: EventMetricsRecorder

  /**
   * Worker metrics provider (optional).
   */
  workerMetrics?: WorkerMetricsProvider

  /**
   * General tracing provider (optional).
   */
  tracing?: {
    startSpan(name: string): TracingSpan
  }
}

/**
 * No-Op implementations for when observability is not configured.
 * These provide compatibility without requiring external dependencies.
 * @internal
 */

class NoOpTracingSpan implements TracingSpan {
  addEvent(): void {
    // No-op
  }

  setStatus(): void {
    // No-op
  }

  end(): void {
    // No-op
  }
}

class NoOpEventTracingProvider implements EventTracingProvider {
  startSpan(): TracingSpan {
    return new NoOpTracingSpan()
  }

  recordMetrics(): void {
    // No-op
  }
}

class NoOpEventMetricsRecorder implements EventMetricsRecorder {
  recordEventProcessed(): void {
    // No-op
  }

  recordEventPublished(): void {
    // No-op
  }

  recordEventError(): void {
    // No-op
  }
}

class NoOpWorkerMetricsProvider implements WorkerMetricsProvider {
  recordWorkerStartup(): void {
    // No-op
  }

  recordTaskExecution(): void {
    // No-op
  }

  recordWorkerError(): void {
    // No-op
  }
}

/**
 * Create a no-op observability provider.
 * Used by default when no observability implementation is provided.
 *
 * @returns An ObservabilityProvider with all no-op implementations
 * @internal
 */
export function createNoOpObservabilityProvider(): ObservabilityProvider {
  return {
    eventTracing: new NoOpEventTracingProvider(),
    eventMetrics: new NoOpEventMetricsRecorder(),
    workerMetrics: new NoOpWorkerMetricsProvider(),
    tracing: {
      startSpan(): TracingSpan {
        return new NoOpTracingSpan()
      },
    },
  }
}
