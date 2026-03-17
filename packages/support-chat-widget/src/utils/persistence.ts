import type { SupportApiConfig } from '../api/supportApi'
import type { ChatMessage, ConversationContext } from '../types'
import { secureStorage } from './storage'

/**
 * Data structure for the persisted chat state.
 *
 * This object is stored in localStorage to allow session recovery across page refreshes
 * and provides the basis for offline support.
 */
export interface PersistedState {
  /** The current active conversation ID */
  readonly conversationId: string | null
  /** Recent messages (limited to latest 50) */
  readonly messages: readonly ChatMessage[]
  /** Messages queued while offline */
  readonly pendingMessages: readonly ChatMessage[]
  /** Unix timestamp of the last synchronization with the server */
  readonly lastSyncAt: number
  /** Associated business context (e.g., order ID) */
  readonly context?: ConversationContext
}

/** The key used for storing chat state in secureStorage */
const STORAGE_KEY = 'chat_state'

/** Maximum number of messages to keep in persistent storage to prevent overflow */
const MAX_MESSAGES = 50

/**
 * Utility for persisting and restoring chat state.
 *
 * Provides methods for saving the current conversation state, loading it on mount,
 * and synchronizing messages that were queued during offline periods.
 */
export const chatPersistence = {
  /**
   * Saves the current chat state to persistent storage.
   * Automatically trims the message list to the most recent 50 messages.
   *
   * @param state - The state object to persist.
   */
  save(state: PersistedState): void {
    try {
      const limitedState: PersistedState = {
        ...state,
        messages: state.messages.slice(-MAX_MESSAGES),
      }

      secureStorage.set(STORAGE_KEY, limitedState, {
        expiry: 7 * 24 * 60 * 60 * 1000, // 7 days expiry
      })
    } catch (error) {
      console.error('[Persistence] Failed to save state:', error)
    }
  },

  /**
   * Loads the persisted chat state from storage.
   *
   * @returns The loaded state or null if no valid state exists or it has expired.
   */
  load(): PersistedState | null {
    try {
      const state = secureStorage.get<PersistedState>(STORAGE_KEY)

      if (!state) {
        return null
      }

      // Validate data integrity before returning
      if (!this._validateState(state)) {
        console.warn('[Persistence] Invalid state detected, clearing...')
        this.clear()
        return null
      }

      return state
    } catch (error) {
      console.error('[Persistence] Failed to load state:', error)
      return null
    }
  },

  /**
   * Synchronizes messages that were queued locally while the user was offline.
   *
   * Iterates through the pending queue and sends each message to the server.
   * Clears the queue upon successful completion of the entire batch.
   *
   * @param config - API configuration (base URL, etc.).
   * @param conversationId - The ID of the conversation to sync to.
   * @returns A promise that resolves when the sync attempt is finished.
   *
   * @throws {Error} If the API client fails to initialize or a critical network error occurs.
   */
  async syncPendingMessages(config: SupportApiConfig, conversationId: string): Promise<void> {
    const state = this.load()

    if (!state || state.pendingMessages.length === 0) {
      return
    }

    try {
      const { createSupportApi } = await import('../api/supportApi')
      const api = createSupportApi(config)
      const failedMessages: ChatMessage[] = []

      // Send each message in the queue
      for (const message of state.pendingMessages) {
        try {
          await api.sendMessage(conversationId, message.content)
        } catch (error) {
          console.error('[Persistence] Failed to sync message:', error)
          failedMessages.push(message)
        }
      }

      // Only remove messages that were actually delivered.
      this.save({
        ...state,
        pendingMessages: failedMessages,
        lastSyncAt: Date.now(),
      })
    } catch (error) {
      console.error('[Persistence] Failed to sync pending messages:', error)
      throw error
    }
  },

  /**
   * Permanently removes all persisted chat data from storage.
   */
  clear(): void {
    secureStorage.remove(STORAGE_KEY)
  },

  /**
   * Validates the structure and content of a state object.
   *
   * @param state - The object to validate.
   * @returns True if the object matches the PersistedState interface.
   * @internal
   */
  _validateState(state: unknown): state is PersistedState {
    if (!state || typeof state !== 'object') {
      return false
    }

    const s = state as Record<string, unknown>

    // Required field checks
    if (
      typeof s.lastSyncAt !== 'number' ||
      !Array.isArray(s.messages) ||
      !Array.isArray(s.pendingMessages)
    ) {
      return false
    }

    // conversationId can be null but must be a string if present
    if (s.conversationId !== null && typeof s.conversationId !== 'string') {
      return false
    }

    // Sanity check: sync time cannot be in the future
    if (s.lastSyncAt > Date.now()) {
      return false
    }

    return true
  },
}
