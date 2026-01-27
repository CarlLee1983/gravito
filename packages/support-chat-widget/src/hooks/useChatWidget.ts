import { useCallback, useEffect } from 'react'
import type { UseChatWidgetOptions, UseChatWidgetReturn } from '../types'
import { useConversation } from './useConversation'
import { useCrossTabSync } from './useCrossTabSync'
import { useErrorHandler } from './useErrorHandler'
import { useMessages } from './useMessages'
import { useOfflineSupport } from './useOfflineSupport'
import { useTypingStatus } from './useTypingStatus'
import { useWebSocket } from './useWebSocket'

/**
 * Main integration hook for the Support Chat Widget.
 *
 * Orchestrates multiple specialized hooks to provide a unified interface for
 * conversation management, real-time messaging, offline support, and error handling.
 * This hook serves as the primary state manager for the chat UI.
 *
 * @param options - Configuration options for the chat widget.
 * @returns A comprehensive object containing the widget's state and action methods.
 *
 * @throws {Error} If conversation creation or WebSocket connection fails.
 *
 * @example
 * ```tsx
 * const {
 *   isOpen,
 *   messages,
 *   connectionStatus,
 *   open,
 *   close,
 *   sendMessage
 * } = useChatWidget({
 *   apiBaseUrl: 'https://api.gravito.io',
 *   wsUrl: 'wss://ws.gravito.io',
 *   context: { type: 'GENERAL' }
 * });
 * ```
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

  // Synchronize open state across multiple browser tabs
  const [isOpen, setIsOpen] = useCrossTabSync('chat_is_open', defaultOpen)

  // Manage conversation lifecycle (creation, ending, persistence)
  const { conversation, conversationId, createConversation, endConversation } = useConversation({
    apiBaseUrl,
    context,
  })

  // Centralized error state and retry logic
  const { error, handleError, clearError, retry } = useErrorHandler()

  // Provide offline capabilities and message queuing
  const { isOnline, queueMessage, pendingCount, syncPending } = useOfflineSupport({
    apiConfig: { baseUrl: apiBaseUrl },
    conversationId,
    onSyncSuccess: () => {
      console.log('Offline messages synced successfully')
    },
    onSyncError: (err) => {
      console.error('Failed to sync offline messages', err)
      handleError(err)
    },
  })

  // Manage message history and pagination
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

  // Real-time communication via WebSocket
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
      // Messages received via WebSocket are handled by useMessages internal listeners
      console.log('[useChatWidget] Received message:', message)
    },
    onStatusChange: onConnectionChange,
  })

  // Track and notify typing status
  const { isAgentTyping, notifyTyping } = useTypingStatus({
    conversationId,
    emit,
    on,
  })

  /**
   * Opens the chat window and initializes the session.
   *
   * If no active conversation exists, it attempts to create one. It also
   * establishes the WebSocket connection and synchronizes any pending offline messages.
   */
  const open = useCallback(async () => {
    setIsOpen(true)
    onOpenChange?.(true)

    // Create a new conversation if one doesn't exist
    if (!conversationId) {
      try {
        await createConversation()
      } catch (err) {
        handleError(err as Error)
      }
    }

    // Connect to the real-time server
    if (conversationId) {
      await connect()
    }

    // Attempt to sync messages queued while offline
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
   * Closes the chat window and terminates the real-time connection.
   */
  const close = useCallback(() => {
    setIsOpen(false)
    onOpenChange?.(false)

    // Disconnect WebSocket to save resources
    disconnect()
  }, [disconnect, onOpenChange, setIsOpen])

  /**
   * Toggles the visibility of the chat window.
   */
  const toggle = useCallback(() => {
    if (isOpen) {
      close()
    } else {
      open()
    }
  }, [isOpen, open, close])

  /**
   * Sends a message to the current conversation.
   *
   * If the user is offline, the message is queued for later delivery.
   * Otherwise, it is sent immediately via the API.
   *
   * @param content - The textual content of the message.
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

  /**
   * Automatically triggers synchronization when the connection is restored.
   */
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
