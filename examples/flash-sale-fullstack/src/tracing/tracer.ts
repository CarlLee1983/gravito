/**
 * Flash Sale Tracer 工具
 *
 * 提供業務層手動追蹤的便捷函式
 */
import { type Span, SpanStatusCode, type Tracer, trace } from '@opentelemetry/api'

const TRACER_NAME = 'flash-sale-service'

export function getFlashSaleTracer(): Tracer {
  return trace.getTracer(TRACER_NAME)
}

/**
 * 包裝非同步函式以自動建立 Span
 */
export async function withSpan<T>(
  spanName: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getFlashSaleTracer()
  return tracer.startActiveSpan(spanName, { attributes }, async (span) => {
    try {
      const result = await fn(span)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error)
      }
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    } finally {
      span.end()
    }
  })
}

/**
 * 記錄業務事件到當前 Span
 */
export function recordEvent(
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  const currentSpan = trace.getActiveSpan()
  if (currentSpan) {
    currentSpan.addEvent(name, attributes)
  }
}
