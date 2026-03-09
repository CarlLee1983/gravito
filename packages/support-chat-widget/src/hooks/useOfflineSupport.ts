import { useCallback, useEffect, useState } from 'react'
import type { SupportApiConfig } from '../api/supportApi'
import type { ChatMessage } from '../types'
import { chatPersistence } from '../utils/persistence'

/**
 * Options for the {@link useOfflineSupport} hook.
 */
export interface UseOfflineSupportOptions {
  /**
   * Configuration for the Support API.
   */
  readonly apiConfig: SupportApiConfig
  /**
   * The unique identifier of the current conversation.
   * If null, message queuing and synchronization will be disabled.
   */
  readonly conversationId: string | null
  /**
   * Optional callback triggered when pending messages are successfully synchronized with the server.
   */
  readonly onSyncSuccess?: () => void
  /**
   * Optional callback triggered when synchronization fails.
   * @param error - The error encountered during synchronization.
   */
  readonly onSyncError?: (error: Error) => void
}

/**
 * Return type of the {@link useOfflineSupport} hook.
 */
export interface UseOfflineSupportReturn {
  /**
   * Indicates whether the browser is currently online.
   */
  readonly isOnline: boolean
  /**
   * Adds a message to the local pending queue for later synchronization.
   * @param content - The text content of the message.
   */
  readonly queueMessage: (content: string) => void
  /**
   * The number of messages currently waiting in the local queue.
   */
  readonly pendingCount: number
  /**
   * Manually triggers the synchronization of pending messages to the server.
   * @returns A promise that resolves when the synchronization attempt completes.
   */
  readonly syncPending: () => Promise<void>
}

/**
 * A hook that provides offline support for the chat widget.
 *
 * It monitors the browser's network status, queues messages locally when offline,
 * and automatically synchronizes them when the connection is restored.
 *
 * @param options - Configuration options for offline support.
 * @returns An object containing network status and methods to manage the message queue.
 *
 * @example
 * ```tsx
 * const { isOnline, queueMessage, pendingCount, syncPending } = useOfflineSupport({
 *   apiConfig: { baseUrl: 'https://api.gravito.io' },
 *   conversationId: 'CONV-123',
 *   onSyncSuccess: () => console.log('Messages synced!'),
 *   onSyncError: (err) => console.error('Sync failed:', err)
 * });
 *
 * const handleSend = (text: string) => {
 *   if (!isOnline) {
 *     queueMessage(text);
 *   } else {
 *     // Send via normal API
 *   }
 * };
 * ```
 */
export function useOfflineSupport(options: UseOfflineSupportOptions): UseOfflineSupportReturn {
  const { apiConfig, conversationId, onSyncSuccess, onSyncError } = options

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(() => {
    const state = chatPersistence.load()
    return state?.pendingMessages.length ?? 0
  })

  /**
   * Adds a message to the pending queue in local persistence.
   *
   * @param content - The message content to queue.
   */
  const queueMessage = useCallback(
    (content: string) => {
      if (!conversationId) {
        return
      }

      const state = chatPersistence.load()

      const queuedMessage: ChatMessage = {
        id: `pending-${Date.now()}`,
        conversationId,
        sender: 'CUSTOMER',
        content,
        status: 'sending',
        createdAt: new Date(),
      }

      chatPersistence.save({
        conversationId: state?.conversationId ?? conversationId,
        messages: state?.messages ?? [],
        pendingMessages: [...(state?.pendingMessages ?? []), queuedMessage],
        lastSyncAt: Date.now(),
        context: state?.context,
      })

      setPendingCount((prev) => prev + 1)
    },
    [conversationId]
  )

  /**
   * Synchronizes all pending messages with the remote server.
   *
   * @throws {Error} If the synchronization process fails (handled via onSyncError).
   */
  const syncPending = useCallback(async () => {
    if (!conversationId) {
      return
    }

    const state = chatPersistence.load()
    if (!state || state.pendingMessages.length === 0) {
      return
    }

    try {
      await chatPersistence.syncPendingMessages(apiConfig, conversationId)
      setPendingCount(0)
      onSyncSuccess?.()
    } catch (error) {
      onSyncError?.(error instanceof Error ? error : new Error('Sync failed'))
    }
  }, [apiConfig, conversationId, onSyncSuccess, onSyncError])

  /**
   * Listen for browser online/offline events.
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  /**
   * Automatically trigger synchronization when the browser comes back online.
   */
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPending()
    }
  }, [isOnline, pendingCount, syncPending])

  return {
    isOnline,
    queueMessage,
    pendingCount,
    syncPending,
  }
}
