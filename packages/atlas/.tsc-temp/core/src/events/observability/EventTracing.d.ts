/**
 * @gravito/core - Event System Tracing
 *
 * 使用 OpenTelemetry API 實現事件系統的分佈式追蹤。
 * 提供事件派發、監聽器執行與隊列操作的端到端追蹤。
 */
import type { Span } from '@opentelemetry/api'
/**
 * 事件追蹤配置
 */
export interface EventTracingConfig {
  /** Tracer 名稱 */
  tracerName?: string
  /** 是否記錄詳細的 payload 信息 */
  capturePayload?: boolean
  /** 最大 payload 大小（字節） */
  maxPayloadSize?: number
}
/**
 * 事件追蹤管理器
 *
 * 提供事件系統的分佈式追蹤能力，包括：
 * - 事件派發追蹤
 * - 監聽器執行追蹤
 * - 隊列操作追蹤
 * - 異常記錄與追蹤
 *
 * @public
 */
export declare class EventTracing {
  private tracer
  private config
  constructor(config?: EventTracingConfig)
  /**
   * 為事件派發創建追蹤 Span
   *
   * @param eventName - 事件名稱
   * @param listenerCount - 監聽器數量
   * @param priority - 優先級（high, normal, low）
   * @param payload - 事件負載（可選，用於調試）
   * @returns Span 實例
   *
   * @example
   * ```typescript
   * const tracer = new EventTracing()
   * const span = tracer.startDispatchSpan('order:created', 3, 'high', orderData)
   * try {
   *   // 派發事件
   *   await dispatchEvent()
   *   tracer.endDispatchSpan(span, 'ok')
   * } catch (error) {
   *   tracer.endDispatchSpan(span, 'error', error)
   * }
   * ```
   */
  startDispatchSpan(
    eventName: string,
    listenerCount: number,
    priority?: 'high' | 'normal' | 'low',
    payload?: unknown
  ): Span
  /**
   * 為監聽器執行創建追蹤 Span
   *
   * @param _parentSpan - 父 Span
   * @param eventName - 事件名稱
   * @param listenerName - 監聽器名稱/標識
   * @param listenerIndex - 監聽器索引
   * @returns 子 Span 實例
   */
  startListenerSpan(
    _parentSpan: Span,
    eventName: string,
    listenerName: string,
    listenerIndex: number
  ): Span
  /**
   * 為隊列操作創建追蹤 Span
   *
   * @param _parentSpan - 父 Span
   * @param operationType - 操作類型（enqueue, dequeue, requeue）
   * @param eventName - 事件名稱
   * @param priority - 優先級
   * @returns Span 實例
   */
  startQueueOperationSpan(
    _parentSpan: Span,
    operationType: 'enqueue' | 'dequeue' | 'requeue',
    eventName: string,
    priority: 'high' | 'normal' | 'low'
  ): Span
  /**
   * 結束事件派發 Span
   *
   * @param span - Span 實例
   * @param status - 完成狀態（ok, error）
   * @param error - 如果 status 為 error，傳遞錯誤對象
   */
  endDispatchSpan(span: Span, status?: 'ok' | 'error', error?: Error): void
  /**
   * 結束監聽器執行 Span
   *
   * @param span - Span 實例
   * @param status - 完成狀態（ok, error）
   * @param duration - 執行時間（毫秒）
   * @param error - 如果發生錯誤，傳遞錯誤對象
   */
  endListenerSpan(span: Span, status?: 'ok' | 'error', duration?: number, error?: Error): void
  /**
   * 結束隊列操作 Span
   *
   * @param span - Span 實例
   * @param status - 完成狀態（ok, error）
   * @param queueDepth - 當前隊列深度
   * @param error - 如果發生錯誤，傳遞錯誤對象
   */
  endQueueOperationSpan(
    span: Span,
    status?: 'ok' | 'error',
    queueDepth?: number,
    error?: Error
  ): void
  /**
   * 在 Span 中添加自定義屬性
   *
   * @param span - Span 實例
   * @param attributes - 屬性對象
   */
  addSpanAttributes(span: Span, attributes: Record<string, string | number | boolean>): void
  /**
   * 在 Span 中添加自定義事件
   *
   * @param span - Span 實例
   * @param eventName - 事件名稱
   * @param attributes - 事件屬性（可選）
   */
  addSpanEvent(
    span: Span,
    eventName: string,
    attributes?: Record<string, string | number | boolean>
  ): void
  /**
   * 記錄異常到 Span
   *
   * @param span - Span 實例
   * @param error - 錯誤對象
   */
  recordException(span: Span, error: Error | string): void
  /**
   * 創建定時器 Span（用於測量操作時間）
   *
   * @param operationName - 操作名稱
   * @returns 對象包含 span 和結束函數
   *
   * @example
   * ```typescript
   * const { span, endTimer } = tracer.startTimer('slow-operation')
   * try {
   *   await slowOperation()
   *   endTimer('ok')
   * } catch (error) {
   *   endTimer('error', error)
   * }
   * ```
   */
  startTimer(operationName: string): {
    span: Span
    endTimer: (status?: 'ok' | 'error', error?: Error) => void
  }
  /**
   * 獲取 tracer 實例（用於高級用法）
   *
   * @returns OpenTelemetry Tracer 實例
   */
  getTracer(): import('@opentelemetry/api').Tracer
}
/**
 * 獲取或創建全局 EventTracing 實例
 *
 * @param config - 配置選項
 * @returns EventTracing 實例
 *
 * @public
 */
export declare function getEventTracing(config?: EventTracingConfig): EventTracing
