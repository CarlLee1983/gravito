/**
 * @gravito/core - Event System Tracer
 *
 * Manages OpenTelemetry distributed tracing for event dispatch.
 */

import type { Span, Tracer } from '@opentelemetry/api'
import { trace } from '@opentelemetry/api'

/**
 * Event tracer for distributed tracing support.
 *
 * Integrates with OpenTelemetry to provide:
 * - Event dispatch tracing
 * - Listener execution tracing
 * - Error recording
 * - Span hierarchy
 *
 * @public
 */
export class EventTracer {
  private tracer: Tracer

  /**
   * Create a new EventTracer instance.
   *
   * @param tracerName - Name of the tracer (default: '@gravito/core')
   */
  constructor(tracerName = '@gravito/core') {
    this.tracer = trace.getTracer(tracerName)
  }

  /**
   * Start a span for event dispatch.
   *
   * @param eventName - Name of the event
   * @param callbackCount - Number of callbacks registered for this event
   * @param priority - Priority level (high, normal, low)
   * @returns Span for the event dispatch
   */
  startDispatchSpan(eventName: string, callbackCount: number, priority: string): Span {
    return this.tracer.startSpan(`event.dispatch.${eventName}`, {
      attributes: {
        'event.name': eventName,
        'event.priority': priority,
        'event.listener_count': callbackCount,
      },
    })
  }

  /**
   * Start a span for listener execution.
   *
   * @param parentSpan - Parent span for this listener
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener in the callback list
   * @returns Child span for the listener execution
   */
  startListenerSpan(parentSpan: Span, eventName: string, listenerIndex: number): Span {
    return this.tracer.startSpan(`event.listener.${eventName}`, {
      attributes: {
        'event.name': eventName,
        'event.listener_index': listenerIndex,
      },
    })
  }

  /**
   * Record an error in the span.
   *
   * @param span - Span to record error in
   * @param error - Error that occurred
   */
  recordError(span: Span, error: Error): void {
    span.recordException(error)
    span.setStatus({ code: 2 }) // ERROR status code
  }

  /**
   * End a span with a specific status.
   *
   * @param span - Span to end
   * @param status - Status ('ok' or 'error')
   */
  endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
    if (status === 'ok') {
      span.setStatus({ code: 0 }) // OK status code
    }
    span.end()
  }

  /**
   * Create a timer span for measuring duration.
   *
   * @param eventName - Name of the event
   * @returns Object with span and duration recording function
   */
  startTimer(eventName: string): { span: Span; endTimer: (status?: 'ok' | 'error') => void } {
    const span = this.tracer.startSpan(`event.duration.${eventName}`)
    const startTime = performance.now()

    return {
      span,
      endTimer: (status?: 'ok' | 'error') => {
        const duration = (performance.now() - startTime) / 1000
        span.setAttributes({
          'event.duration_seconds': duration,
        })
        this.endSpan(span, status)
      },
    }
  }
}
