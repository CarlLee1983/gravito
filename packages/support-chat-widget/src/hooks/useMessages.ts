import { useCallback, useEffect, useState } from 'react'
import { createSupportApi } from '../api/supportApi'
import type { ChatMessage, UseMessagesOptions, UseMessagesReturn } from '../types'

/**
 * 訊息管理 Hook
 *
 * 處理訊息的載入、發送、分頁等功能，包含樂觀更新和錯誤處理。
 *
 * @param options - 訊息管理選項
 * @returns 訊息狀態和操作方法
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, loadMore, hasMore } = useMessages({
 *   apiBaseUrl: 'https://api.gravito.io',
 *   conversationId: 'CONV-123'
 * })
 *
 * // 發送訊息
 * await sendMessage('Hello!')
 *
 * // 載入更多訊息
 * if (hasMore) {
 *   await loadMore()
 * }
 * ```
 */
export function useMessages(options: UseMessagesOptions): UseMessagesReturn {
  const { apiBaseUrl, conversationId } = options

  const [messages, setMessages] = useState<readonly ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()

  // 建立 API 客戶端
  const api = createSupportApi({ baseUrl: apiBaseUrl })

  /**
   * 載入歷史訊息
   */
  const loadMessages = useCallback(async () => {
    if (!conversationId) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await api.getMessages(conversationId, { limit: 50 })

      if (result.success && result.data) {
        setMessages([...result.data.messages])
        setHasMore(result.data.hasMore)
        setNextCursor(result.data.nextCursor)
      } else if (result.error) {
        setError(new Error(result.error.message))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [api, conversationId])

  /**
   * 載入更多訊息（分頁）
   */
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || !nextCursor || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await api.getMessages(conversationId, {
        limit: 50,
        cursor: nextCursor,
        direction: 'before',
      })

      if (result.success && result.data) {
        // 將新訊息添加到列表前面（因為是載入更早的訊息）
        setMessages((prev) => [...result.data!.messages, ...prev])
        setHasMore(result.data.hasMore)
        setNextCursor(result.data.nextCursor)
      } else if (result.error) {
        setError(new Error(result.error.message))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [api, conversationId, hasMore, nextCursor, isLoading])

  /**
   * 發送訊息（帶樂觀更新）
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) {
        throw new Error('No active conversation')
      }

      // 樂觀更新：立即顯示訊息（狀態為 sending）
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId,
        sender: 'CUSTOMER',
        content,
        status: 'sending',
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, optimisticMessage])
      setError(null)

      try {
        const result = await api.sendMessage(conversationId, content)

        if (result.success && result.data) {
          // 用真實訊息取代樂觀訊息
          setMessages((prev) =>
            prev.map((msg) => (msg.id === optimisticMessage.id ? result.data! : msg))
          )
        } else if (result.error) {
          // 發送失敗，標記為 failed
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === optimisticMessage.id ? { ...msg, status: 'failed' as const } : msg
            )
          )
          setError(new Error(result.error.message))
        }
      } catch (err) {
        // 發送失敗，標記為 failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id ? { ...msg, status: 'failed' as const } : msg
          )
        )
        setError(err instanceof Error ? err : new Error('Unknown error'))
        throw err
      }
    },
    [api, conversationId]
  )

  /**
   * 添加接收到的訊息（從 WebSocket）
   *
   * @internal 保留供未來 WebSocket 整合使用
   */
  const _addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      // 檢查是否已存在（避免重複）
      if (prev.some((msg) => msg.id === message.id)) {
        return prev
      }
      return [...prev, message]
    })
  }, [])

  /**
   * 會話 ID 改變時重新載入訊息
   */
  useEffect(() => {
    if (conversationId) {
      loadMessages()
    } else {
      // 沒有會話時清空訊息
      setMessages([])
      setHasMore(false)
      setNextCursor(undefined)
    }
  }, [conversationId, loadMessages])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadMore,
    hasMore,
  }
}
