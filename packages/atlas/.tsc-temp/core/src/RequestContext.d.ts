/**
 * @fileoverview RequestContext - AsyncLocalStorage-based request context management
 *
 * Allows deep service layers to access request-scoped data (requestId, userId, etc.)
 * without passing parameters through the call stack.
 *
 * @module @gravito/core/RequestContext
 * @since 2.2.0
 */
/**
 * 請求上下文資料介面
 * 包含請求相關的唯一識別碼和上下文資訊
 * @public
 */
export interface RequestContextData {
  /** 唯一的請求識別碼 */
  requestId: string
  /** 使用者 ID（可選） */
  userId?: string
  /** 租戶 ID（可選） */
  tenantId?: string
  /** 追蹤 ID（可選） */
  traceId?: string
  /** 自訂欄位 */
  [key: string]: unknown
}
/**
 * RequestContext 物件 - 管理請求上下文的 API
 *
 * 提供在非同步鏈中存取和設定請求上下文的方法
 * @public
 */
export declare const RequestContext: {
  /**
   * 在給定的上下文中執行函式
   *
   * 確保函式及其所有非同步呼叫都在同一個上下文中執行
   *
   * @param data - 請求上下文資料
   * @param fn - 要執行的函式（可以是非同步的或同步的）
   * @returns 如果函式是非同步的，返回 Promise；如果是同步的，直接返回值
   *
   * @example
   * ```typescript
   * await RequestContext.run({ requestId: 'req-123' }, async () => {
   *   const userId = RequestContext.get()?.userId;
   * });
   *
   * const result = RequestContext.run({ requestId: 'req-123' }, () => {
   *   return 'sync-result';
   * });
   * ```
   */
  run<T>(data: RequestContextData, fn: () => T | Promise<T>): T | Promise<T>
  /**
   * 獲取當前請求的上下文資料
   *
   * @returns 請求上下文資料，如果不在請求上下文中則返回 undefined
   *
   * @example
   * ```typescript
   * const context = RequestContext.get();
   * if (context) {
   *   console.log(context.requestId);
   * }
   * ```
   */
  get(): RequestContextData | undefined
  /**
   * 獲取當前請求的上下文資料，如果不存在則拋出錯誤
   *
   * @returns 請求上下文資料
   * @throws Error 如果不在請求上下文中
   *
   * @example
   * ```typescript
   * const context = RequestContext.getOrThrow();
   * console.log(context.requestId); // 保證不為 undefined
   * ```
   */
  getOrThrow(): RequestContextData
  /**
   * 在當前上下文中設定或修改值
   *
   * @param key - 要設定的欄位名稱
   * @param value - 要設定的值
   * @throws Error 如果不在請求上下文中
   *
   * @example
   * ```typescript
   * RequestContext.set('userId', 'user-456');
   * const userId = RequestContext.get()?.userId; // 'user-456'
   * ```
   */
  set(key: string, value: unknown): void
}
export default RequestContext
