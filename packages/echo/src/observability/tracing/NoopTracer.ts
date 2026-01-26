import type { Span, Tracer } from './Tracer'

/**
 * A non-operational implementation of {@link Span}.
 * Used as a fallback when tracing is disabled to avoid null checks.
 */
export class NoopSpan implements Span {
  setAttribute(): this {
    return this
  }
  setAttributes(): this {
    return this
  }
  addEvent(): this {
    return this
  }
  setStatus(): this {
    return this
  }
  end(): void {}
}

/**
 * A non-operational implementation of {@link Tracer}.
 * Ensures the application can run without a tracing backend.
 *
 * @example
 * ```typescript
 * const tracer = new NoopTracer();
 * const span = tracer.startSpan('test');
 * span.end();
 * ```
 */
export class NoopTracer implements Tracer {
  /**
   * Returns a {@link NoopSpan} that does nothing.
   */
  startSpan(): Span {
    return new NoopSpan()
  }

  /**
   * Executes the function with a {@link NoopSpan}.
   */
  async withSpan<T>(_name: string, fn: (span: Span) => T | Promise<T>): Promise<T> {
    return fn(new NoopSpan())
  }
}
