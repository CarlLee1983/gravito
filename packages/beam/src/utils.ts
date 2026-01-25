import { BeamNetworkError, BeamTimeoutError } from './errors'
import type { RetryOptions } from './types'

/**
 * 預設可重試的 HTTP 狀態碼
 */
const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]

/**
 * 建立帶超時的 fetch 函式
 *
 * @param timeout - 超時時間（毫秒）
 * @returns 帶超時功能的 fetch 函式
 */
export function createFetchWithTimeout(
  timeout: number
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async (input, init) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      })
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BeamTimeoutError(timeout)
      }
      throw new BeamNetworkError('Network request failed', error)
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * 執行帶重試的請求
 *
 * @param fetchFn - 執行請求的函式
 * @param options - 重試配置選項
 * @returns 請求響應
 */
export async function executeWithRetry(
  fetchFn: () => Promise<Response>,
  options: RetryOptions = {}
): Promise<Response> {
  const { count = 0, delay = 1000, statusCodes = DEFAULT_RETRY_STATUS_CODES, backoff = 2 } = options

  let lastError: Error | undefined
  let attempts = 0

  while (attempts <= count) {
    try {
      const response = await fetchFn()

      // 如果狀態碼不需要重試，或已達到最大重試次數，直接返回
      if (!statusCodes.includes(response.status) || attempts === count) {
        return response
      }

      // 需要重試 - 消費 response body 以釋放連線
      await response.text().catch(() => {
        // 忽略消費錯誤
      })
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 如果已達到最大重試次數，拋出錯誤
      if (attempts === count) {
        throw lastError
      }
    }

    attempts++
    if (attempts <= count) {
      // 計算延遲時間（指數退避）
      const waitTime = delay * backoff ** (attempts - 1)
      await sleep(waitTime)
    }
  }

  // 理論上不會執行到這裡，但為了類型安全
  throw lastError || new Error('Request failed')
}

/**
 * 延遲指定時間
 *
 * @param ms - 延遲時間（毫秒）
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 解析 headers（支援靜態物件或動態函式）
 *
 * @param headers - headers 配置
 * @returns 解析後的 headers 物件
 */
export async function resolveHeaders(
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
): Promise<Record<string, string> | undefined> {
  if (!headers) {
    return undefined
  }
  if (typeof headers === 'function') {
    return await headers()
  }
  return headers
}
