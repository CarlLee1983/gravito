/**
 * HTTP Tracing Middleware
 *
 * Gravito 中間件，自動為所有 HTTP 請求建立 Span
 */

import type { GravitoContext } from '@gravito/core'
import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api'

type MiddlewareFn = (c: GravitoContext, next: () => Promise<void>) => Promise<void>

export function httpTracingMiddleware(): MiddlewareFn {
  const tracer = trace.getTracer('flash-sale-http')

  return async (c, next) => {
    const method = c.req.method
    const path = c.req.path
    const url = c.req.url

    const span = tracer.startSpan(`${method} ${path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.target': path,
        'http.scheme': new URL(url).protocol.replace(':', ''),
        'http.host': c.req.header('host') ?? 'unknown',
        'http.user_agent': c.req.header('user-agent') ?? 'unknown',
        'http.request_content_length': parseInt(c.req.header('content-length') ?? '0', 10),
      },
    })

    const startTime = performance.now()

    try {
      await next()

      const statusCode = c.res?.status ?? 200
      const duration = (performance.now() - startTime) / 1000

      span.setAttributes({
        'http.status_code': statusCode,
        'http.response_content_length': parseInt(c.res?.headers.get('content-length') ?? '0', 10),
        'http.duration_seconds': duration,
      })

      if (statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${statusCode}`,
        })
      } else {
        span.setStatus({ code: SpanStatusCode.OK })
      }
    } catch (error) {
      const duration = (performance.now() - startTime) / 1000
      span.setAttributes({ 'http.duration_seconds': duration })

      if (error instanceof Error) {
        span.recordException(error)
      }
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Internal Server Error',
      })
      throw error
    } finally {
      span.end()
    }
  }
}
