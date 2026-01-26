/**
 * 追蹤 Span 介面（OpenTelemetry 相容）
 */
export interface Span {
  /** 設定屬性 */
  setAttribute(key: string, value: string | number | boolean): this
  /** 設定多個屬性 */
  setAttributes(attributes: Record<string, string | number | boolean>): this
  /** 記錄事件 */
  addEvent(name: string, attributes?: Record<string, string | number>): this
  /** 設定狀態 */
  setStatus(status: { code: SpanStatusCode; message?: string }): this
  /** 結束 Span */
  end(): void
}

export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

/**
 * Tracer 介面
 */
export interface Tracer {
  /** 開始新 Span */
  startSpan(name: string, options?: SpanOptions): Span
  /** 在 Span 上下文中執行函數 */
  withSpan<T>(name: string, fn: (span: Span) => T | Promise<T>): Promise<T>
}

export interface SpanOptions {
  kind?: 'client' | 'server' | 'producer' | 'consumer' | 'internal'
  attributes?: Record<string, string | number | boolean>
}
