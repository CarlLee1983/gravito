import { useCallback, useEffect, useState } from 'react'
import type { UseChatWidgetOptions, UseChatWidgetReturn } from '../types'
import { useConversation } from './useConversation'
import { useCrossTabSync } from './useCrossTabSync'
import { useErrorHandler } from './useErrorHandler'
import { useMessages } from './useMessages'
import { useOfflineSupport } from './useOfflineSupport'
import { useTypingStatus } from './useTypingStatus'
import { useWebSocket } from './useWebSocket'

/**
 * 聊天小工具整合 Hook
 *
 * 整合所有子 Hooks，提供統一的狀態管理和操作介面。
 *
 * @param options - 聊天小工具選項
 * @returns 完整的狀態和操作方法
 */
export function useChatWidget(options: UseChatWidgetOptions): UseChatWidgetReturn {
  const {
    apiBaseUrl,
    wsUrl,
    context,
    defaultOpen = false,
    onOpenChange,
    onConnectionChange,
  } = options

  // 跨 Tab 同步開啟狀態
  const [isOpen, setIsOpen] = useCrossTabSync('chat_is_open', defaultOpen)

  // 會話管理
  const { conversation, conversationId, createConversation, endConversation } = useConversation({
    apiBaseUrl,
    context,
  })

  // 錯誤處理
  const { error, handleError, clearError, retry } = useErrorHandler()

  // 離線支援
  const { isOnline, queueMessage, pendingCount, syncPending } = useOfflineSupport({
    apiConfig: { baseUrl: apiBaseUrl },
    conversationId,
    onSyncSuccess: () => {
      console.log('離線訊息同步成功')
    },
    onSyncError: (err) => {
      console.error('離線訊息同步失敗', err)
      handleError(err)
    },
  })

  // 訊息管理
  const {
    messages,
    isLoading,
    sendMessage: sendMessageApi,
    loadMore,
    hasMore,
  } = useMessages({
    apiBaseUrl,
    conversationId,
  })

  // WebSocket 連線
  const {
    status: connectionStatus,
    connect,
    disconnect,
    emit,
    on,
  } = useWebSocket({
    wsUrl,
    conversationId,
    onMessage: (message) => {
      // WebSocket 接收到的訊息由 useMessages 內部的監聽或是狀態更新處理
      console.log('[useChatWidget] Received message:', message)
    },
    onStatusChange: onConnectionChange,
  })

  // 輸入狀態
  const { isAgentTyping, notifyTyping } = useTypingStatus({
    conversationId,
    emit,
    on,
  })

  /**
   * 開啟聊天視窗
   */

  const open = useCallback(async () => {
    setIsOpen(true)
    onOpenChange?.(true)

    // 如果沒有會話，建立新會話
    if (!conversationId) {
      try {
        await createConversation()
      } catch (err) {
        handleError(err as Error)
      }
    }

    // 連接 WebSocket
    if (conversationId) {
      await connect()
    }

    // 嘗試同步離線訊息
    if (pendingCount > 0 && isOnline) {
      await syncPending()
    }
  }, [
    conversationId,
    createConversation,
    connect,
    handleError,
    onOpenChange,
    setIsOpen,
    pendingCount,
    isOnline,
    syncPending,
  ])

  /**
   * 關閉聊天視窗
   */
  const close = useCallback(() => {
    setIsOpen(false)
    onOpenChange?.(false)

    // 斷開 WebSocket
    disconnect()
  }, [disconnect, onOpenChange, setIsOpen])

  /**
   * 切換開啟狀態
   */
  const toggle = useCallback(() => {
    if (isOpen) {
      close()
    } else {
      open()
    }
  }, [isOpen, open, close])

  /**
   * 發送訊息
   */
  const sendMessage = useCallback(
    async (content: string) => {
      try {
        if (!isOnline) {
          queueMessage(content)
          return
        }

        await sendMessageApi(content)
        clearError()
        notifyTyping()
      } catch (err) {
        handleError(err as Error, () => sendMessage(content))
      }
    },
    [sendMessageApi, handleError, clearError, isOnline, queueMessage, notifyTyping]
  )

  // 監聽連線狀態，自動重連或同步
  useEffect(() => {
    if (connectionStatus === 'connected' && pendingCount > 0) {
      syncPending()
    }
  }, [connectionStatus, pendingCount, syncPending])

  return {
    // 狀態
    isOpen,
    messages,
    connectionStatus,
    isLoading,
    error,
    conversation,
    isTyping: isAgentTyping,
    hasMore,

    // 操作
    open,
    close,
    toggle,
    sendMessage,
    loadMore,
    retry,
    clearError,
    endConversation,
  }
}
