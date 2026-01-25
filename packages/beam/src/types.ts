import type { BeamError } from './errors'

/**
 * 重試配置選項
 *
 * @public
 */
export interface RetryOptions {
  /**
   * 最大重試次數，預設 0（不重試）
   */
  count?: number

  /**
   * 重試延遲（毫秒），預設 1000
   */
  delay?: number

  /**
   * 應該重試的狀態碼，預設 [408, 429, 500, 502, 503, 504]
   */
  statusCodes?: number[]

  /**
   * 指數退避因子，預設 2
   */
  backoff?: number
}

/**
 * Options for the Beam (RPC) client.
 *
 * Orbit Beam uses these options to configure the underlying HTTP client.
 * It extends the standard fetch RequestInit but adds framework-specific
 * features like dynamic header resolution.
 *
 * @public
 */
export interface BeamOptions extends Omit<RequestInit, 'headers'> {
  /**
   * Custom headers to include in every request.
   *
   * Can be either:
   * - A static object: `Record<string, string>`
   * - A resolver function: `() => Record<string, string> | Promise<Record<string, string>>`
   *
   * The resolver function is useful for dynamic headers like authentication tokens
   * that may need to be refreshed or retrieved from a store.
   *
   * @example
   * ```typescript
   * headers: { 'X-Custom': 'value' }
   * ```
   *
   * @example
   * ```typescript
   * headers: () => ({ 'Authorization': `Bearer ${getToken()}` })
   * ```
   */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)

  /**
   * 請求超時時間（毫秒）
   *
   * 如果請求超過此時間，將拋出 BeamTimeoutError
   * 預設無超時限制
   *
   * @example
   * ```typescript
   * timeout: 5000  // 5 秒超時
   * ```
   */
  timeout?: number

  /**
   * 重試配置
   *
   * 配置自動重試邏輯，適用於臨時性錯誤（如 5xx、429 等）
   *
   * @example
   * ```typescript
   * retry: {
   *   count: 3,
   *   delay: 1000,
   *   statusCodes: [408, 429, 500, 502, 503, 504]
   * }
   * ```
   */
  retry?: RetryOptions

  /**
   * 請求前攔截器
   *
   * 在發送請求前呼叫，可用於修改請求配置（如添加認證 token）
   *
   * @param config - 請求配置
   * @returns 修改後的請求配置
   *
   * @example
   * ```typescript
   * onRequest: async (config) => {
   *   config.headers = {
   *     ...config.headers,
   *     'X-Request-ID': generateRequestId()
   *   }
   *   return config
   * }
   * ```
   */
  onRequest?: (config: RequestInit) => RequestInit | Promise<RequestInit>

  /**
   * 響應後攔截器
   *
   * 在收到響應後呼叫，可用於統一處理響應（如日誌記錄）
   *
   * @param response - 響應物件
   * @returns 原始或修改後的響應物件
   *
   * @example
   * ```typescript
   * onResponse: async (response) => {
   *   console.log(`Response ${response.status} from ${response.url}`)
   *   return response
   * }
   * ```
   */
  onResponse?: (response: Response) => Response | Promise<Response>

  /**
   * 錯誤攔截器
   *
   * 當請求發生錯誤時呼叫，可用於統一錯誤處理（如錯誤上報）
   * 注意：此攔截器不會阻止錯誤拋出，錯誤仍會被重新拋出
   *
   * @param error - BeamError 實例
   *
   * @example
   * ```typescript
   * onError: async (error) => {
   *   await reportError(error)
   * }
   * ```
   */
  onError?: (error: BeamError) => void | Promise<void>
}
