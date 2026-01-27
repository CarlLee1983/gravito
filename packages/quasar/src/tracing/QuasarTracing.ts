import {
  context,
  type Context as OTelContext,
  propagation,
  type Span,
  SpanKind,
  type Tracer,
  trace,
} from '@opentelemetry/api'
import { ContextExtractor } from '../utils/ContextExtractor'
import type { TraceContext, TracingOptions } from './types'

/**
 * QuasarTracing handles OpenTelemetry integration for the agent.
 * @since 5.1.0
 */
export class QuasarTracing {
  private tracer?: Tracer
  private enabled = false

  constructor(options: TracingOptions = {}) {
    this.enabled = options.enabled ?? false
    if (this.enabled) {
      this.tracer = trace.getTracer(options.serviceName || 'quasar-agent')
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Start a new span for a job.
   */
  startSpan(name: string, parentContext?: OTelContext): Span | undefined {
    if (!this.tracer) return undefined

    return this.tracer.startSpan(
      name,
      {
        kind: SpanKind.CONSUMER,
      },
      parentContext || context.active()
    )
  }

  /**
   * Extract trace context from job data.
   */
  extractContext(carrier: Record<string, any>): OTelContext | undefined {
    if (!this.enabled) return undefined
    return ContextExtractor.extract(carrier)
  }

  /**
   * Inject trace context into a carrier (job data).
   */
  injectContext(carrier: Record<string, any>, ctx: OTelContext = context.active()): void {
    if (!this.enabled) return
    propagation.inject(ctx, carrier)
  }

  /**
   * Get IDs from a span.
   */
  getTraceContext(span: Span): TraceContext {
    const spanContext = span.spanContext()
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    }
  }
}
