/**
 * @gravito/core - Event System Tracer
 *
 * Manages OpenTelemetry distributed tracing for event dispatch.
 */
import type { Span } from '@opentelemetry/api'
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
export declare class EventTracer {
  private tracer
  /**
   * Create a new EventTracer instance.
   *
   * @param tracerName - Name of the tracer (default: '@gravito/core')
   */
  constructor(tracerName?: string)
  /**
   * Start a span for event dispatch.
   *
   * @param eventName - Name of the event
   * @param callbackCount - Number of callbacks registered for this event
   * @param priority - Priority level (high, normal, low)
   * @returns Span for the event dispatch
   */
  startDispatchSpan(eventName: string, callbackCount: number, priority: string): Span
  /**
   * Start a span for listener execution.
   *
   * @param _parentSpan - Parent span for this listener
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener in the callback list
   * @returns Child span for the listener execution
   */
  startListenerSpan(_parentSpan: Span, eventName: string, listenerIndex: number): Span
  /**
   * Record an error in the span.
   *
   * @param span - Span to record error in
   * @param error - Error that occurred
   */
  recordError(span: Span, error: Error): void
  /**
   * End a span with a specific status.
   *
   * @param span - Span to end
   * @param status - Status ('ok' or 'error')
   */
  endSpan(span: Span, status?: 'ok' | 'error'): void
  /**
   * Create a timer span for measuring duration.
   *
   * @param eventName - Name of the event
   * @returns Object with span and duration recording function
   */
  startTimer(eventName: string): {
    span: Span
    endTimer: (status?: 'ok' | 'error') => void
  }
}
