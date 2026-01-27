import { useCallback, useEffect, useState } from 'react'
import { createSupportApi } from '../api/supportApi'
import type { ChatMessage, UseMessagesOptions, UseMessagesReturn } from '../types'

/**
 * A hook for managing chat messages within a conversation.
 *
 * It handles loading message history, sending new messages with optimistic updates,
 * pagination (loading more messages), and error handling. It provides a reactive
 * list of messages that updates as the user interacts with the chat.
 *
 * @param options - Configuration options for message management.
 * @returns An object containing the message list, loading state, and methods to interact with messages.
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, loadMore, hasMore, isLoading } = useMessages({
 *   apiBaseUrl: 'https://api.gravito.io',
 *   conversationId: 'CONV-123'
 * });
 *
 * // Send a message
 * const handleSend = async (text: string) => {
 *   await sendMessage(text);
 * };
 *
 * // Load older messages when scrolling up
 * if (hasMore && !isLoading) {
 *   await loadMore();
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

  // Initialize API client
  const api = createSupportApi({ baseUrl: apiBaseUrl })

  /**
   * Loads the initial set of messages for the current conversation.
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
   * Loads the next page of older messages (pagination).
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
        // Prepend older messages to the list
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
   * Sends a new message to the conversation with optimistic UI updates.
   *
   * The message is immediately added to the local state with a 'sending' status.
   * If the server request fails, the status is updated to 'failed'.
   *
   * @param content - The text content of the message to send.
   * @throws {Error} If no active conversation ID is provided or if the API request fails.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) {
        throw new Error('No active conversation')
      }

      // Optimistic update: Add message with 'sending' status
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
          // Replace optimistic message with the real one from server
          setMessages((prev) =>
            prev.map((msg) => (msg.id === optimisticMessage.id ? result.data! : msg))
          )
        } else if (result.error) {
          // Mark as failed on server error
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === optimisticMessage.id ? { ...msg, status: 'failed' as const } : msg
            )
          )
          setError(new Error(result.error.message))
        }
      } catch (err) {
        // Mark as failed on network error
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
   * Internal helper to add a message (e.g., from a WebSocket event).
   *
   * @param message - The message object to add.
   * @internal
   */
  const _addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      // Prevent duplicates
      if (prev.some((msg) => msg.id === message.id)) {
        return prev
      }
      return [...prev, message]
    })
  }, [])

  /**
   * Effect: Reload messages when the conversation ID changes.
   */
  useEffect(() => {
    if (conversationId) {
      loadMessages()
    } else {
      // Clear state when no conversation is active
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
