import type { Env, Photon, Schema } from '@gravito/photon'
import { BeamError } from './errors'
import { createBeam } from './index'
import type { BeamOptions } from './types'

/**
 * 建立帶有認證的 Beam 客戶端
 *
 * 這是一個便利函式，用於創建自動附加 Bearer token 的客戶端。
 * Token 可以是靜態字串或動態函式，支援每次請求時刷新 token。
 *
 * @template T - Photon 應用程式類型
 * @param baseUrl - API 伺服器的基礎 URL
 * @param getToken - 取得 token 的函式（支援同步或非同步）
 * @param options - 其他 Beam 配置選項（不包含 headers）
 * @returns 已配置認證的 Beam 客戶端
 *
 * @example
 * ```typescript
 * // 靜態 token
 * const client = createAuthenticatedBeam<AppType>(
 *   'https://api.example.com',
 *   () => 'my-static-token'
 * )
 *
 * // 動態 token（從 localStorage 讀取）
 * const client = createAuthenticatedBeam<AppType>(
 *   'https://api.example.com',
 *   () => localStorage.getItem('authToken') || ''
 * )
 *
 * // 非同步 token（從 API 刷新）
 * const client = createAuthenticatedBeam<AppType>(
 *   'https://api.example.com',
 *   async () => {
 *     const token = await refreshToken()
 *     return token
 *   },
 *   { timeout: 5000 }
 * )
 * ```
 *
 * @public
 */
export function createAuthenticatedBeam<T extends Photon<Env, Schema, string>>(
  baseUrl: string,
  getToken: () => string | Promise<string>,
  options?: Omit<BeamOptions, 'headers'>
): ReturnType<typeof createBeam<T>> {
  return createBeam<T>(baseUrl, {
    ...options,
    headers: async () => ({
      Authorization: `Bearer ${await getToken()}`,
    }),
  })
}

/**
 * 解析響應並提取 JSON 資料，失敗時拋出錯誤
 *
 * 這是一個便利函式，用於自動檢查響應狀態並解析 JSON。
 * 如果響應狀態不是 2xx，會拋出 BeamError。
 *
 * @template T - 預期的響應資料類型
 * @param response - Fetch Response 物件
 * @returns 解析後的 JSON 資料
 * @throws {BeamError} 當響應狀態不是 2xx 時
 *
 * @example
 * ```typescript
 * const res = await client.users.$get()
 * const data = await unwrapResponse<User[]>(res)
 * // 如果請求失敗，會自動拋出 BeamError
 * ```
 *
 * @public
 */
export async function unwrapResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new BeamError(`Request failed with status ${response.status}`, response.status)
  }

  // 處理空響應（例如 204 No Content）
  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text)
}

/**
 * 安全地解析響應，不拋出錯誤
 *
 * 這個函式提供類似 Rust/Go 的錯誤處理模式，回傳一個包含 data 或 error 的物件。
 * 不會拋出錯誤，適合用於需要明確處理錯誤的場景。
 *
 * @template T - 預期的響應資料類型
 * @param response - Fetch Response 物件
 * @returns 包含 data 或 error 的物件
 *
 * @example
 * ```typescript
 * const res = await client.users.$get()
 * const { data, error } = await safeResponse<User[]>(res)
 *
 * if (error) {
 *   console.error('Request failed:', error.message)
 *   return
 * }
 *
 * console.log('Users:', data)
 * ```
 *
 * @public
 */
export async function safeResponse<T>(
  response: Response
): Promise<{ data: T; error: null } | { data: null; error: BeamError }> {
  try {
    if (!response.ok) {
      return {
        data: null,
        error: new BeamError(`Request failed with status ${response.status}`, response.status),
      }
    }

    // 處理空響應（例如 204 No Content）
    const text = await response.text()
    if (!text) {
      return { data: undefined as T, error: null }
    }

    return { data: JSON.parse(text), error: null }
  } catch (e) {
    return {
      data: null,
      error: new BeamError('Parse error', undefined, 'PARSE_ERROR', e),
    }
  }
}
