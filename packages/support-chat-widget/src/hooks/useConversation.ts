import { useCallback, useEffect, useState } from 'react'
import { createSupportApi } from '../api/supportApi'
import type { Conversation, UseConversationOptions, UseConversationReturn } from '../types'
import { secureStorage } from '../utils/storage'

/**
 * 會話管理 Hook
 *
 * 處理會話的建立、恢復、驗證和結束，包含 localStorage 持久化。
 *
 * @param options - 會話管理選項
 * @returns 會話狀態和操作方法
 *
 * @example
 * ```tsx
 * const { conversation, conversationId, createConversation } = useConversation({
 *   apiBaseUrl: 'https://api.gravito.io',
 *   context: { type: 'ORDER', id: 'ORD-123' }
 * })
 *
 * // 建立新會話
 * if (!conversation) {
 *   await createConversation()
 * }
 * ```
 */
export function useConversation(options: UseConversationOptions): UseConversationReturn {
  const { apiBaseUrl, context, storageKey = 'conversation_id' } = options

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 建立 API 客戶端
  const api = createSupportApi({ baseUrl: apiBaseUrl })

  /**
   * 建立新會話
   */
  const createConversation = useCallback(async () => {
    setIsInitializing(true)
    setError(null)

    try {
      const result = await api.createConversation(context)

      if (result.success && result.data) {
        setConversation(result.data)
        setConversationId(result.data.id)

        // 持久化會話 ID
        secureStorage.set(storageKey, result.data.id, {
          expiry: 7 * 24 * 60 * 60 * 1000, // 7 天過期
        })
      } else if (result.error) {
        setError(new Error(result.error.message))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create conversation'))
    } finally {
      setIsInitializing(false)
    }
  }, [api, context, storageKey])

  /**
   * 恢復已存在的會話
   */
  const restoreConversation = useCallback(
    async (id: string) => {
      setIsInitializing(true)
      setError(null)

      try {
        const result = await api.getConversation(id)

        if (result.success && result.data) {
          // 會話有效
          setConversation(result.data)
          setConversationId(result.data.id)
        } else {
          // 會話不存在或無效，清除本地存儲
          secureStorage.remove(storageKey)
          setConversationId(null)
          setConversation(null)
        }
      } catch (err) {
        // 恢復失敗，清除本地存儲
        secureStorage.remove(storageKey)
        setConversationId(null)
        setConversation(null)
        setError(err instanceof Error ? err : new Error('Failed to restore conversation'))
      } finally {
        setIsInitializing(false)
      }
    },
    [api, storageKey]
  )

  /**
   * 結束會話
   */
  const endConversation = useCallback(async () => {
    // 清除本地存儲
    secureStorage.remove(storageKey)
    setConversationId(null)
    setConversation(null)
    setError(null)
  }, [storageKey])

  /**
   * 初始化：嘗試從 localStorage 恢復會話
   */
  useEffect(() => {
    const savedId = secureStorage.get<string>(storageKey)

    if (savedId) {
      // 嘗試恢復已存在的會話
      restoreConversation(savedId)
    } else {
      // 無已存在的會話，可能需要建立新會話
      setIsInitializing(false)
    }
  }, [storageKey, restoreConversation])

  return {
    conversation,
    conversationId,
    isInitializing,
    error,
    createConversation,
    endConversation,
  }
}
