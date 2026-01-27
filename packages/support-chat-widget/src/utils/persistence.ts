import type { SupportApiConfig } from '../api/supportApi'
import type { ChatMessage, ConversationContext } from '../types'
import { secureStorage } from './storage'

/**
 * 持久化狀態結構
 */
export interface PersistedState {
  /** 會話 ID */
  readonly conversationId: string | null
  /** 最近的訊息（最多 50 條） */
  readonly messages: readonly ChatMessage[]
  /** 待發送訊息（離線時暫存） */
  readonly pendingMessages: readonly ChatMessage[]
  /** 最後同步時間 */
  readonly lastSyncAt: number
  /** 會話上下文 */
  readonly context?: ConversationContext
}

/**
 * 持久化存儲 Key
 */
const STORAGE_KEY = 'chat_state'

/**
 * 最大訊息數量限制
 */
const MAX_MESSAGES = 50

/**
 * 聊天狀態持久化工具
 *
 * 提供會話狀態的存儲、載入和同步功能。
 *
 * @example
 * ```tsx
 * // 儲存狀態
 * chatPersistence.save({
 *   conversationId: 'CONV-123',
 *   messages: [...],
 *   pendingMessages: [],
 *   lastSyncAt: Date.now()
 * })
 *
 * // 載入狀態
 * const state = chatPersistence.load()
 * if (state) {
 *   console.log('已恢復會話:', state.conversationId)
 * }
 * ```
 */
export const chatPersistence = {
  /**
   * 儲存聊天狀態
   *
   * @param state - 要儲存的狀態
   */
  save(state: PersistedState): void {
    try {
      // 限制訊息數量（保留最新的 N 條）
      const limitedState: PersistedState = {
        ...state,
        messages: state.messages.slice(-MAX_MESSAGES),
      }

      // 序列化並存儲
      secureStorage.set(STORAGE_KEY, limitedState, {
        expiry: 7 * 24 * 60 * 60 * 1000, // 7 天過期
      })
    } catch (error) {
      console.error('[Persistence] Failed to save state:', error)
    }
  },

  /**
   * 載入聊天狀態
   *
   * @returns 載入的狀態，如果不存在或無效則返回 null
   */
  load(): PersistedState | null {
    try {
      const state = secureStorage.get<PersistedState>(STORAGE_KEY)

      if (!state) {
        return null
      }

      // 驗證資料完整性
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
   * 同步待發送訊息
   *
   * 在重新連線後，將離線時暫存的訊息發送到伺服器。
   *
   * @param config - API 配置
   * @param conversationId - 會話 ID
   * @returns Promise
   */
  async syncPendingMessages(config: SupportApiConfig, conversationId: string): Promise<void> {
    const state = this.load()

    if (!state || state.pendingMessages.length === 0) {
      return
    }

    try {
      const { createSupportApi } = await import('../api/supportApi')
      const api = createSupportApi(config)

      // 逐一發送待發送訊息
      for (const message of state.pendingMessages) {
        try {
          await api.sendMessage(conversationId, message.content)
        } catch (error) {
          console.error('[Persistence] Failed to sync message:', error)
          // 繼續嘗試發送其他訊息
        }
      }

      // 清空待發送佇列
      this.save({
        ...state,
        pendingMessages: [],
        lastSyncAt: Date.now(),
      })
    } catch (error) {
      console.error('[Persistence] Failed to sync pending messages:', error)
      throw error
    }
  },

  /**
   * 清除持久化狀態
   */
  clear(): void {
    secureStorage.remove(STORAGE_KEY)
  },

  /**
   * 驗證狀態資料完整性
   *
   * @param state - 要驗證的狀態
   * @returns 是否有效
   * @internal
   */
  _validateState(state: unknown): state is PersistedState {
    if (!state || typeof state !== 'object') {
      return false
    }

    const s = state as Record<string, unknown>

    // 檢查必要欄位
    if (
      typeof s.lastSyncAt !== 'number' ||
      !Array.isArray(s.messages) ||
      !Array.isArray(s.pendingMessages)
    ) {
      return false
    }

    // conversationId 可以是 null
    if (s.conversationId !== null && typeof s.conversationId !== 'string') {
      return false
    }

    // 檢查時間戳是否合理（不能是未來時間）
    if (s.lastSyncAt > Date.now()) {
      return false
    }

    return true
  },
}
