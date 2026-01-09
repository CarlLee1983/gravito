/**
 * @gravito/monitor - Tracing Middleware
 */

import type { GravitoContext } from '@gravito/core'
import type { TracingManager } from './TracingManager'

/**
 * Create middleware that traces HTTP requests
 */
export function createTracingMiddleware(tracer: TracingManager) {
  return async (c: GravitoContext, next: () => Promise<void>): Promise<Response | undefined> => {
    const method = c.req.method
    const path = c.req.path
    const url = c.req.url

    // Extract parent context from incoming headers
    const parentContext = tracer.extractContext(c.req.raw.headers)

    // Start a new span
    const span = tracer.startSpan(`${method} ${path}`, {
      attributes: {
        'http.method': method,
        'http.url': url,
        'http.target': path,
        'http.host': new URL(url).host,
      },
      ...(parentContext
        ? {
            parentSpan: {
              name: 'parent',
              traceId: parentContext.traceId,
              spanId: parentContext.spanId,
              startTime: Date.now(),
              attributes: {},
              status: 'unset' as const,
              events: [],
            },
          }
        : {}),
    })

    // Attach span to context for downstream access
    c.set('span', span as unknown)

    try {
      await next()
      tracer.endSpan(span, 'ok')
    } catch (error) {
      // Record error
      tracer.setAttribute(span, 'error', true)
      tracer.setAttribute(
        span,
        'error.message',
        error instanceof Error ? error.message : 'Unknown error'
      )
      tracer.addEvent(span, 'exception', {
        'exception.type': error instanceof Error ? error.constructor.name : 'Error',
        'exception.message': error instanceof Error ? error.message : String(error),
      })
      tracer.endSpan(span, 'error')
      throw error
    }

    return undefined
  }
}

export { type Span, type SpanContext, type SpanEvent, TracingManager } from './TracingManager'
