/**
 * Represents a single unit of work in a trace.
 * Compatible with OpenTelemetry Span interface to allow seamless integration.
 */
export interface Span {
  /**
   * Sets a single attribute on the span.
   * Attributes provide additional metadata for the operation.
   */
  setAttribute(key: string, value: string | number | boolean): this
  /**
   * Sets multiple attributes on the span at once.
   */
  setAttributes(attributes: Record<string, string | number | boolean>): this
  /**
   * Records a specific event that occurred during the span's lifetime.
   */
  addEvent(name: string, attributes?: Record<string, string | number>): this
  /**
   * Sets the final status of the span.
   */
  setStatus(status: { code: SpanStatusCode; message?: string }): this
  /**
   * Marks the end of the span, making it ready for export.
   */
  end(): void
}

/**
 * Standard status codes for a {@link Span}.
 */
export enum SpanStatusCode {
  /** Default status. */
  UNSET = 0,
  /** Operation completed successfully. */
  OK = 1,
  /** Operation failed. */
  ERROR = 2,
}

/**
 * Defines the tracing interface for the Echo module.
 * Used to track the lifecycle of webhook requests and deliveries.
 *
 * @example
 * ```typescript
 * const tracer: Tracer = getTracer();
 * await tracer.withSpan('process-webhook', async (span) => {
 *   span.setAttribute('provider', 'stripe');
 *   // ... logic
 * });
 * ```
 */
export interface Tracer {
  /**
   * Starts a new span without making it active.
   * The caller is responsible for ending the span.
   */
  startSpan(name: string, options?: SpanOptions): Span
  /**
   * Executes a function within the context of a new span.
   * Automatically ends the span when the function completes.
   */
  withSpan<T>(name: string, fn: (span: Span) => T | Promise<T>): Promise<T>
}

/**
 * Configuration options for starting a new {@link Span}.
 */
export interface SpanOptions {
  /** The relationship between the span and its neighbors. */
  kind?: 'client' | 'server' | 'producer' | 'consumer' | 'internal'
  /** Initial attributes to set on the span. */
  attributes?: Record<string, string | number | boolean>
}
