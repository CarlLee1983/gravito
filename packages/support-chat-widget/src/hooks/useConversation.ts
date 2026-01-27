import { useCallback, useEffect, useState } from 'react'
import { createSupportApi } from '../api/supportApi'
import type { Conversation, UseConversationOptions, UseConversationReturn } from '../types'
import { secureStorage } from '../utils/storage'

/**
 * A hook for managing the lifecycle of a support conversation.
 *
 * It handles creating new conversations, restoring existing ones from persistent storage,
 * validating session status with the server, and ending sessions. It ensures that
 * conversation state is maintained across page reloads using secure local storage.
 *
 * @param options - Configuration options for conversation management.
 * @returns An object containing the conversation state, initialization status, and control methods.
 *
 * @example
 * ```tsx
 * const { conversation, conversationId, createConversation, endConversation } = useConversation({
 *   apiBaseUrl: 'https://api.gravito.io',
 *   context: { type: 'ORDER', id: 'ORD-123' }
 * });
 *
 * // Create a new session if none exists
 * const startChat = async () => {
 *   if (!conversationId) {
 *     await createConversation();
 *   }
 * };
 * ```
 */
export function useConversation(options: UseConversationOptions): UseConversationReturn {
  const { apiBaseUrl, context, storageKey = 'conversation_id' } = options

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Initialize API client
  const api = createSupportApi({ baseUrl: apiBaseUrl })

  /**
   * Creates a new conversation session on the server.
   *
   * @throws {Error} If the API request fails or returns an error.
   */
  const createConversation = useCallback(async () => {
    setIsInitializing(true)
    setError(null)

    try {
      const result = await api.createConversation(context)

      if (result.success && result.data) {
        setConversation(result.data)
        setConversationId(result.data.id)

        // Persist conversation ID for 7 days
        secureStorage.set(storageKey, result.data.id, {
          expiry: 7 * 24 * 60 * 60 * 1000,
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
   * Restores an existing conversation session by its ID.
   *
   * If the session is invalid or expired on the server, it will be cleared from local storage.
   *
   * @param id - The unique identifier of the conversation to restore.
   * @throws {Error} If the restoration process encounters an unexpected error.
   */
  const restoreConversation = useCallback(
    async (id: string) => {
      setIsInitializing(true)
      setError(null)

      try {
        const result = await api.getConversation(id)

        if (result.success && result.data) {
          // Session is valid
          setConversation(result.data)
          setConversationId(result.data.id)
        } else {
          // Session not found or invalid, clear local storage
          secureStorage.remove(storageKey)
          setConversationId(null)
          setConversation(null)
        }
      } catch (err) {
        // Restoration failed, clear local storage as a safety measure
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
   * Ends the current conversation session and clears all local state and storage.
   */
  const endConversation = useCallback(async () => {
    // Clear local storage and state
    secureStorage.remove(storageKey)
    setConversationId(null)
    setConversation(null)
    setError(null)
  }, [storageKey])

  /**
   * Initialization: Attempt to restore session from localStorage on mount.
   */
  useEffect(() => {
    const savedId = secureStorage.get<string>(storageKey)

    if (savedId) {
      // Attempt to restore existing session
      restoreConversation(savedId)
    } else {
      // No existing session found
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
