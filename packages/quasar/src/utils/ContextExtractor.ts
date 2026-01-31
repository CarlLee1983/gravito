import { context, type Context as OTelContext, propagation } from '@opentelemetry/api'

/**
 * ContextExtractor is a utility for extracting OpenTelemetry context from various carrier formats.
 *
 * It is specifically designed to handle metadata from non-Node.js sources like Laravel,
 * ensuring trace continuity across different technology stacks in the Gravito ecosystem.
 *
 * @public
 * @since 9.0.0
 *
 * @example
 * ```typescript
 * const carrier = { data: { zenith: { traceparent: '...' } } };
 * const ctx = ContextExtractor.extract(carrier);
 * ```
 */
export class ContextExtractor {
  /**
   * Extract OTel context from a carrier object.
   *
   * Analyzes the carrier for standard OTel headers, Laravel Zenith specific metadata,
   * or common nested data structures to reconstruct the distributed tracing context.
   *
   * @param carrier - The object containing potential trace context headers or metadata.
   * @returns The extracted OpenTelemetry context, or the active context if extraction fails.
   *
   * @example
   * ```typescript
   * const spanContext = ContextExtractor.extract(job.data);
   * ```
   */
  static extract(carrier: Record<string, any>): OTelContext {
    if (!carrier || typeof carrier !== 'object') {
      return context.active()
    }

    let ctx = propagation.extract(context.active(), carrier)

    if (this.isContextEmpty(ctx)) {
      if (carrier.data?.zenith) {
        ctx = propagation.extract(context.active(), carrier.data.zenith)
      }

      if (this.isContextEmpty(ctx) && carrier.zenith) {
        ctx = propagation.extract(context.active(), carrier.zenith)
      }

      if (this.isContextEmpty(ctx) && carrier.data && typeof carrier.data === 'object') {
        ctx = propagation.extract(context.active(), carrier.data)
      }
    }

    return ctx
  }

  /**
   * Check if the extracted context is essentially empty.
   *
   * Verifies if the span context within the OTel context has a valid trace ID
   * or if it represents an uninitialized/empty state.
   *
   * @param ctx - The OpenTelemetry context to verify.
   * @returns True if the context is empty or contains an invalid trace ID.
   */
  private static isContextEmpty(ctx: OTelContext): boolean {
    const spanContext = (ctx as any)
      .getValue?.(Symbol.for('OpenTelemetry Context Key Span'))
      ?.spanContext?.()
    if (!spanContext) {
      return true
    }
    return spanContext.traceId === '00000000000000000000000000000000'
  }
}
