/**
 * 基礎 Beam 錯誤類別
 *
 * 所有 Beam 相關錯誤的基礎類別，提供統一的錯誤格式
 */
export class BeamError extends Error {
  /**
   * @param message - 錯誤訊息
   * @param status - HTTP 狀態碼（可選）
   * @param code - 錯誤代碼（可選）
   * @param cause - 原始錯誤（可選）
   */
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'BeamError'
    // 修復 TypeScript 繼承 Error 的原型鏈問題
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * 網路錯誤
 *
 * 當網路連線失敗時拋出（例如：DNS 查詢失敗、連線被拒絕等）
 */
export class BeamNetworkError extends BeamError {
  /**
   * @param message - 錯誤訊息
   * @param cause - 原始錯誤（可選）
   */
  constructor(message: string, cause?: unknown) {
    super(message, undefined, 'NETWORK_ERROR', cause)
    this.name = 'BeamNetworkError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * 超時錯誤
 *
 * 當請求超過指定的超時時間時拋出
 */
export class BeamTimeoutError extends BeamError {
  /**
   * @param timeout - 超時時間（毫秒）
   */
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, undefined, 'TIMEOUT')
    this.name = 'BeamTimeoutError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * HTTP 錯誤
 *
 * 當伺服器回傳 4xx 或 5xx 狀態碼時拋出
 */
export class BeamHttpError extends BeamError {
  /**
   * @param message - 錯誤訊息
   * @param status - HTTP 狀態碼
   * @param response - 響應內容（可選）
   */
  constructor(
    message: string,
    status: number,
    public readonly response?: unknown
  ) {
    super(message, status, `HTTP_${status}`)
    this.name = 'BeamHttpError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
