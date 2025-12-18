import { hc } from 'hono/client'
import type { AppRoutes } from './types'

/**
 * 建立型別安全的 API Client
 *
 * 此函數建立一個 Hono Client 實例，具有完整的 TypeScript 型別提示。
 * 前端專案可以使用此 client 來呼叫 API，並獲得 100% 的型別安全。
 *
 * @param baseUrl - API 基礎 URL
 * @returns 型別安全的 Hono Client 實例
 *
 * @example
 * ```typescript
 * // 在瀏覽器端使用
 * import { createClient } from './client'
 *
 * const client = createClient('http://localhost:3000')
 *
 * // 完整的型別提示
 * const result = await client.api.users.login.$post({
 *   json: {
 *     username: 'user',
 *     password: 'pass'
 *   }
 * })
 *
 * // result 的型別會被自動推導
 * console.log(result.success) // ✅ 型別安全
 * ```
 */
export const createClient = (baseUrl: string) => {
  return hc<AppRoutes>(baseUrl)
}

