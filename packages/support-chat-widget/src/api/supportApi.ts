import type {
  ApiErrorCode,
  ApiResponse,
  ChatMessage,
  Conversation,
  ConversationContext,
  MessagesResponse,
  PaginationOptions,
} from '../types'

/**
 * Support API 客戶端配置
 */
export interface SupportApiConfig {
  /** API 基礎 URL */
  readonly baseUrl: string
  /** 自訂 HTTP 標頭 */
  readonly headers?: Readonly<Record<string, string>>
}

/**
 * 建立 Support API 客戶端
 *
 * @param config - API 配置
 * @returns API 客戶端實例
 *
 * @example
 * ```ts
 * const api = createSupportApi({
 *   baseUrl: 'https://api.gravito.io',
 *   headers: { 'Authorization': 'Bearer token' }
 * })
 *
 * const result = await api.createConversation()
 * if (result.success) {
 *   console.log(result.data.id)
 * }
 * ```
 */
export function createSupportApi(config: SupportApiConfig) {
  const { baseUrl, headers = {} } = config

  /**
   * 發送 HTTP 請求
   *
   * @template T - 響應資料類型
   * @param endpoint - API 端點
   * @param options - Fetch 選項
   * @returns API 響應
   */
  async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...options.headers,
        },
      })

      if (!response.ok) {
        // 根據 HTTP 狀態碼判斷錯誤類型
        let code: ApiErrorCode
        let retryable = false

        switch (response.status) {
          case 401:
          case 403:
            code = 'AUTH_ERROR'
            retryable = false
            break
          case 404:
            code = 'NOT_FOUND'
            retryable = false
            break
          case 429:
            code = 'RATE_LIMITED'
            retryable = true
            break
          case 500:
          case 502:
          case 503:
          case 504:
            code = 'SERVER_ERROR'
            retryable = true
            break
          default:
            code = 'SERVER_ERROR'
            retryable = false
        }

        return {
          success: false,
          error: {
            code,
            message: response.statusText,
            retryable,
          },
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      // 網路錯誤或其他異常
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      }
    }
  }

  return {
    /**
     * 建立新會話
     *
     * @param context - 會話上下文（可選）
     * @returns 建立的會話資訊
     *
     * @example
     * ```ts
     * const result = await api.createConversation({
     *   type: 'ORDER',
     *   id: 'ORD-123',
     *   title: '訂單問題'
     * })
     * ```
     */
    createConversation: (context?: ConversationContext) =>
      request<Conversation>('/api/support/conversations', {
        method: 'POST',
        body: JSON.stringify({ context }),
      }),

    /**
     * 取得會話資訊
     *
     * @param id - 會話 ID
     * @returns 會話資訊
     *
     * @example
     * ```ts
     * const result = await api.getConversation('CONV-123')
     * ```
     */
    getConversation: (id: string) => request<Conversation>(`/api/support/conversations/${id}`),

    /**
     * 發送訊息
     *
     * @param conversationId - 會話 ID
     * @param content - 訊息內容
     * @returns 發送的訊息
     *
     * @example
     * ```ts
     * const result = await api.sendMessage('CONV-123', 'Hello!')
     * ```
     */
    sendMessage: (conversationId: string, content: string) =>
      request<ChatMessage>(`/api/support/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),

    /**
     * 取得訊息列表
     *
     * @param conversationId - 會話 ID
     * @param options - 分頁選項
     * @returns 訊息列表
     *
     * @example
     * ```ts
     * const result = await api.getMessages('CONV-123', {
     *   limit: 20,
     *   cursor: 'cursor-123'
     * })
     * ```
     */
    getMessages: (conversationId: string, options?: PaginationOptions) => {
      const params = new URLSearchParams()

      if (options?.limit) {
        params.append('limit', options.limit.toString())
      }
      if (options?.cursor) {
        params.append('cursor', options.cursor)
      }
      if (options?.direction) {
        params.append('direction', options.direction)
      }

      const queryString = params.toString()
      const url = `/api/support/conversations/${conversationId}/messages${
        queryString ? `?${queryString}` : ''
      }`

      return request<MessagesResponse>(url)
    },
  }
}

/**
 * Support API 客戶端類型
 */
export type SupportApi = ReturnType<typeof createSupportApi>
