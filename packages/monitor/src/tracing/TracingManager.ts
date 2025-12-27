/**
 * @gravito/monitor - Tracing Manager
 *
 * OpenTelemetry OTLP tracing integration
 */

import type { TracingConfig } from '../config'

const DEFAULTS = {
  serviceName: 'gravito-app',
  serviceVersion: '1.0.0',
  endpoint: 'http://localhost:4318/v1/traces',
  sampleRate: 1.0,
  resourceAttributes: {} as Record<string, string>,
}

/**
 * Span interface for tracing
 */
export interface Span {
  name: string
  traceId: string
  spanId: string
  parentSpanId?: string
  startTime: number
  endTime?: number
  attributes: Record<string, string | number | boolean>
  status: 'ok' | 'error' | 'unset'
  events: SpanEvent[]
}

export interface SpanEvent {
  name: string
  timestamp: number
  attributes?: Record<string, string | number | boolean>
}

/**
 * Span context for propagation
 */
export interface SpanContext {
  traceId: string
  spanId: string
  traceFlags: number
}

/**
 * Active span holder for async context
 */
let activeSpan: Span | null = null

/**
 * TracingManager handles distributed tracing
 */
export class TracingManager {
  private otelSdk: unknown = null
  private spans: Span[] = []
  private isInitialized = false
  private serviceName: string
  private serviceVersion: string
  private endpoint: string
  private resourceAttributes: Record<string, string>

  constructor(config: TracingConfig = {}) {
    this.serviceName = config.serviceName ?? DEFAULTS.serviceName
    this.serviceVersion = config.serviceVersion ?? DEFAULTS.serviceVersion
    this.endpoint = config.endpoint ?? DEFAULTS.endpoint
    this.resourceAttributes = config.resourceAttributes ?? DEFAULTS.resourceAttributes
  }

  /**
   * Initialize OpenTelemetry SDK if available
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Try to dynamically import OpenTelemetry
      const [
        { NodeSDK },
        { OTLPTraceExporter },
        { Resource },
        { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
      ] = await Promise.all([
        import('@opentelemetry/sdk-node'),
        import('@opentelemetry/exporter-trace-otlp-http'),
        import('@opentelemetry/resources'),
        import('@opentelemetry/semantic-conventions'),
      ])

      const resource = new Resource({
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_SERVICE_VERSION]: this.serviceVersion,
        ...this.resourceAttributes,
      })

      const traceExporter = new OTLPTraceExporter({
        url: this.endpoint,
      })

      this.otelSdk = new NodeSDK({
        resource,
        traceExporter,
      })

      await (this.otelSdk as { start: () => Promise<void> }).start()
      this.isInitialized = true

      console.log(`[Monitor] OpenTelemetry initialized - exporting to ${this.endpoint}`)
    } catch {
      // OpenTelemetry packages not installed - use fallback tracing
      console.log('[Monitor] OpenTelemetry packages not available, using lightweight tracing')
      this.isInitialized = true
    }
  }

  /**
   * Shutdown tracing
   */
  async shutdown(): Promise<void> {
    if (this.otelSdk) {
      await (this.otelSdk as { shutdown: () => Promise<void> }).shutdown()
    }
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    options?: {
      attributes?: Record<string, string | number | boolean>
      parentSpan?: Span
    }
  ): Span {
    const span: Span = {
      name,
      traceId: options?.parentSpan?.traceId ?? generateTraceId(),
      spanId: generateSpanId(),
      parentSpanId: options?.parentSpan?.spanId,
      startTime: Date.now(),
      attributes: options?.attributes ?? {},
      status: 'unset',
      events: [],
    }

    activeSpan = span
    this.spans.push(span)

    return span
  }

  /**
   * End a span
   */
  endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
    span.endTime = Date.now()
    span.status = status

    if (activeSpan === span) {
      activeSpan = null
    }
  }

  /**
   * Add an event to a span
   */
  addEvent(span: Span, name: string, attributes?: Record<string, string | number | boolean>): void {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    })
  }

  /**
   * Set span attribute
   */
  setAttribute(span: Span, key: string, value: string | number | boolean): void {
    span.attributes[key] = value
  }

  /**
   * Get the currently active span
   */
  getActiveSpan(): Span | null {
    return activeSpan
  }

  /**
   * Extract trace context from headers
   */
  extractContext(headers: Headers): SpanContext | null {
    // W3C Trace Context format
    const traceparent = headers.get('traceparent')
    if (!traceparent) {
      return null
    }

    const parts = traceparent.split('-')
    if (parts.length !== 4) {
      return null
    }

    return {
      traceId: parts[1] ?? '',
      spanId: parts[2] ?? '',
      traceFlags: Number.parseInt(parts[3] ?? '0', 16),
    }
  }

  /**
   * Inject trace context into headers
   */
  injectContext(headers: Headers, span: Span): void {
    const traceparent = `00-${span.traceId}-${span.spanId}-01`
    headers.set('traceparent', traceparent)
  }

  /**
   * Get all collected spans (for debugging)
   */
  getSpans(): Span[] {
    return this.spans
  }

  /**
   * Clear collected spans
   */
  clearSpans(): void {
    this.spans = []
  }
}

/**
 * Generate a random trace ID (32 hex chars)
 */
function generateTraceId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a random span ID (16 hex chars)
 */
function generateSpanId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
