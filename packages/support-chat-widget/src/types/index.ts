// ==================== 基礎類型 ====================

/**
 * 訊息發送者類型
 *
 * - CUSTOMER: 客戶發送的訊息
 * - SUPPORT: 客服人員發送的訊息
 * - SYSTEM: 系統自動產生的訊息
 */
export type MessageSender = 'CUSTOMER' | 'SUPPORT' | 'SYSTEM'

/**
 * 會話類型
 *
 * - ORDER: 訂單相關諮詢
 * - PRODUCT: 產品相關諮詢
 * - GENERAL: 一般性諮詢
 */
export type ConversationType = 'ORDER' | 'PRODUCT' | 'GENERAL'

/**
 * WebSocket 連線狀態
 *
 * - connecting: 連線中
 * - connected: 已連線
 * - disconnected: 已斷線
 * - error: 連線錯誤
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * 訊息狀態
 *
 * - sending: 發送中
 * - sent: 已發送
 * - delivered: 已送達
 * - failed: 發送失敗
 */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'failed'

/**
 * 會話狀態
 *
 * - ACTIVE: 進行中
 * - PENDING: 等待客服回應
 * - CLOSED: 已結束
 */
export type ConversationStatus = 'ACTIVE' | 'PENDING' | 'CLOSED'

// ==================== 訊息相關 ====================

/**
 * 聊天訊息
 *
 * 表示客服對話中的單一訊息
 */
export interface ChatMessage {
  /** 訊息唯一識別碼 */
  readonly id: string
  /** 所屬會話 ID */
  readonly conversationId: string
  /** 發送者類型 */
  readonly sender: MessageSender
  /** 訊息內容 */
  readonly content: string
  /** 訊息狀態 */
  readonly status: MessageStatus
  /** 建立時間 */
  readonly createdAt: Date
  /** 額外的元數據 */
  readonly metadata?: Readonly<Record<string, unknown>>
}

/**
 * 系統訊息
 *
 * 繼承自 ChatMessage，但固定 sender 為 SYSTEM
 */
export interface SystemMessage extends Omit<ChatMessage, 'sender'> {
  /** 固定為 SYSTEM */
  readonly sender: 'SYSTEM'
  /** 系統訊息類型 */
  readonly type: 'WELCOME' | 'AGENT_JOINED' | 'AGENT_LEFT' | 'SESSION_ENDED'
}

// ==================== 會話相關 ====================

/**
 * 會話上下文
 *
 * 用於關聯特定業務實體（如訂單、產品）
 */
export interface ConversationContext {
  /** 上下文類型 */
  readonly type: ConversationType
  /** 關聯的業務實體 ID（如訂單號、產品 ID） */
  readonly id?: string
  /** 顯示標題 */
  readonly title?: string
  /** 額外的元數據 */
  readonly metadata?: Readonly<Record<string, unknown>>
}

/**
 * 會話
 *
 * 表示一個完整的客服對話會話
 */
export interface Conversation {
  /** 會話唯一識別碼 */
  readonly id: string
  /** 客戶 ID（可選） */
  readonly customerId?: string
  /** 會話上下文 */
  readonly context?: ConversationContext
  /** 會話狀態 */
  readonly status: ConversationStatus
  /** 建立時間 */
  readonly createdAt: Date
  /** 最後更新時間 */
  readonly updatedAt: Date
}

// ==================== API 相關 ====================

/**
 * 分頁選項
 *
 * 用於載入歷史訊息時的分頁控制
 */
export interface PaginationOptions {
  /** 每頁數量 */
  readonly limit?: number
  /** 游標（用於基於游標的分頁） */
  readonly cursor?: string
  /** 方向（向前或向後） */
  readonly direction?: 'before' | 'after'
}

/**
 * 訊息列表響應
 *
 * API 回傳的訊息列表結構
 */
export interface MessagesResponse {
  /** 訊息陣列 */
  readonly messages: readonly ChatMessage[]
  /** 是否還有更多訊息 */
  readonly hasMore: boolean
  /** 下一頁游標 */
  readonly nextCursor?: string
}

/**
 * API 錯誤碼
 */
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'VALIDATION_ERROR'

/**
 * API 錯誤
 */
export interface ApiError {
  /** 錯誤碼 */
  readonly code: ApiErrorCode
  /** 錯誤訊息 */
  readonly message: string
  /** 是否可重試 */
  readonly retryable: boolean
}

/**
 * API 響應
 *
 * 統一的 API 響應格式
 *
 * @template T - 響應資料類型
 */
export interface ApiResponse<T> {
  /** 請求是否成功 */
  readonly success: boolean
  /** 響應資料（成功時） */
  readonly data?: T
  /** 錯誤資訊（失敗時） */
  readonly error?: ApiError
}

// ==================== 組件 Props ====================

/**
 * 聊天小工具的配置選項
 *
 * @example
 * ```tsx
 * <SupportChatWidget
 *   apiBaseUrl="https://api.gravito.io"
 *   wsUrl="wss://ws.gravito.io"
 *   context={{
 *     type: 'ORDER',
 *     id: 'ORD-12345',
 *     title: '訂單問題諮詢'
 *   }}
 * />
 * ```
 */
export interface ChatWidgetProps {
  /**
   * Gravito Support API 的基礎 URL
   *
   * @example "https://api.gravito.io"
   */
  readonly apiBaseUrl: string

  /**
   * WebSocket 連線 URL
   *
   * @example "wss://ws.gravito.io"
   */
  readonly wsUrl: string

  /**
   * 會話上下文資訊（可選）
   *
   * 用於關聯訂單、產品等業務實體
   */
  readonly context?: ConversationContext

  /**
   * 自訂 CSS 類名（可選）
   *
   * 用於覆寫預設樣式
   */
  readonly className?: string

  /**
   * 初始開啟狀態（可選）
   *
   * @default false
   */
  readonly defaultOpen?: boolean

  /**
   * 開關狀態變化時的回調函數
   *
   * @param open - 新的開啟狀態
   */
  readonly onOpenChange?: (open: boolean) => void

  /**
   * WebSocket 連線狀態變化時的回調函數
   *
   * @param status - 新的連線狀態
   */
  readonly onConnectionChange?: (status: ConnectionStatus) => void
}

// ==================== Hook 相關 ====================

/**
 * WebSocket Hook 選項
 */
export interface UseWebSocketOptions {
  /** WebSocket URL */
  readonly wsUrl: string
  /** 會話 ID */
  readonly conversationId: string | null
  /** 接收到訊息時的回調 */
  readonly onMessage: (message: ChatMessage) => void
  /** 連線狀態變化時的回調 */
  readonly onStatusChange?: (status: ConnectionStatus) => void
}

/**
 * WebSocket Hook 回傳值
 */
export interface UseWebSocketReturn {
  /** 當前連線狀態 */
  readonly status: ConnectionStatus
  /** 連接 WebSocket */
  readonly connect: () => Promise<void>
  /** 斷開 WebSocket */
  readonly disconnect: () => void
}

/**
 * Messages Hook 選項
 */
export interface UseMessagesOptions {
  /** API 基礎 URL */
  readonly apiBaseUrl: string
  /** 會話 ID */
  readonly conversationId: string | null
}

/**
 * Messages Hook 回傳值
 */
export interface UseMessagesReturn {
  /** 訊息列表 */
  readonly messages: readonly ChatMessage[]
  /** 是否正在載入 */
  readonly isLoading: boolean
  /** 錯誤資訊 */
  readonly error: Error | null
  /** 發送訊息 */
  readonly sendMessage: (content: string) => Promise<void>
  /** 載入更多訊息 */
  readonly loadMore: () => Promise<void>
  /** 是否還有更多訊息 */
  readonly hasMore: boolean
}

/**
 * Conversation Hook 選項
 */
export interface UseConversationOptions {
  /** API 基礎 URL */
  readonly apiBaseUrl: string
  /** 會話上下文 */
  readonly context?: ConversationContext
  /** localStorage 鍵名 */
  readonly storageKey?: string
}

/**
 * Conversation Hook 回傳值
 */
export interface UseConversationReturn {
  /** 當前會話 */
  readonly conversation: Conversation | null
  /** 會話 ID */
  readonly conversationId: string | null
  /** 是否正在初始化 */
  readonly isInitializing: boolean
  /** 錯誤資訊 */
  readonly error: Error | null
  /** 建立新會話 */
  readonly createConversation: () => Promise<void>
  /** 結束會話 */
  readonly endConversation: () => Promise<void>
}

/**
 * Error Handler Hook 回傳值
 */
export interface UseErrorHandlerReturn {
  /** 當前錯誤 */
  readonly error: Error | null
  /** 處理錯誤 */
  readonly handleError: (error: Error) => void
  /** 清除錯誤 */
  readonly clearError: () => void
  /** 重試 */
  readonly retry: () => void
}

/**
 * Chat Widget Hook 選項
 */
export interface UseChatWidgetOptions extends ChatWidgetProps {
  // 繼承所有 ChatWidgetProps
}

/**
 * Chat Widget Hook 回傳值
 */
export interface UseChatWidgetReturn {
  // 狀態
  /** 是否開啟 */
  readonly isOpen: boolean
  /** 訊息列表 */
  readonly messages: readonly ChatMessage[]
  /** 連線狀態 */
  readonly connectionStatus: ConnectionStatus
  /** 是否正在載入 */
  readonly isLoading: boolean
  /** 錯誤資訊 */
  readonly error: Error | null
  /** 當前會話 */
  readonly conversation: Conversation | null
  /** 客服是否正在輸入 */
  readonly isTyping: boolean

  // 操作
  /** 開啟聊天視窗 */
  readonly open: () => void
  /** 關閉聊天視窗 */
  readonly close: () => void
  /** 切換開啟狀態 */
  readonly toggle: () => void
  /** 發送訊息 */
  readonly sendMessage: (content: string) => Promise<void>
  /** 重試 */
  readonly retry: () => void
  /** 清除錯誤 */
  readonly clearError: () => void
}

// ==================== 組件 Props ====================

/**
 * ChatHeader 組件的 Props
 */
export interface ChatHeaderProps {
  /** 關閉按鈕點擊事件 */
  readonly onClose: () => void
  /** 連線狀態 */
  readonly connectionStatus: ConnectionStatus
  /** 客服名稱（可選） */
  readonly agentName?: string
  /** 客服頭像（可選） */
  readonly agentAvatar?: string
}

/**
 * ChatMessages 組件的 Props
 */
export interface ChatMessagesProps {
  /** 訊息列表 */
  readonly messages: readonly ChatMessage[]
  /** 是否正在載入 */
  readonly isLoading: boolean
  /** 載入更多訊息 */
  readonly onLoadMore?: () => void
  /** 是否還有更多訊息 */
  readonly hasMore: boolean
}

/**
 * ChatMessage 組件的 Props
 */
export interface ChatMessageProps {
  /** 訊息資料 */
  readonly message: ChatMessage
  /** 重試發送 */
  readonly onRetry?: () => void
}

/**
 * ChatInput 組件的 Props
 */
export interface ChatInputProps {
  /** 發送訊息 */
  readonly onSend: (content: string) => void
  /** 是否禁用 */
  readonly disabled?: boolean
  /** 佔位文字 */
  readonly placeholder?: string
  /** 最大長度 */
  readonly maxLength?: number
}

/**
 * ChatTrigger 組件的 Props
 */
export interface ChatTriggerProps {
  /** 點擊事件 */
  readonly onClick: () => void
  /** 是否有未讀訊息 */
  readonly hasUnread: boolean
  /** 是否已開啟 */
  readonly isOpen: boolean
}

/**
 * ContextBanner 組件的 Props
 */
export interface ContextBannerProps {
  /** 會話上下文 */
  readonly context: ConversationContext
  /** 關閉按鈕點擊事件 */
  readonly onDismiss?: () => void
}

/**
 * ConnectionStatus 組件的 Props
 */
export interface ConnectionStatusProps {
  /** 連線狀態 */
  readonly status: ConnectionStatus
  /** 重試連線 */
  readonly onRetry?: () => void
}

/**
 * TypingIndicator 組件的 Props
 */
export interface TypingIndicatorProps {
  /** 是否正在輸入 */
  readonly isTyping: boolean
  /** 客服名稱（可選） */
  readonly agentName?: string
}

/**
 * ErrorBoundary 組件的 Props
 */
export interface ErrorBoundaryProps {
  /** 子元素 */
  readonly children: React.ReactNode
  /** 錯誤時顯示的內容 */
  readonly fallback?: React.ReactNode
  /** 錯誤處理回調 */
  readonly onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

// ==================== Storage 相關 ====================

/**
 * 存儲選項
 */
export interface StorageOptions {
  /** 是否加密 */
  readonly encrypt?: boolean
  /** 過期時間（毫秒） */
  readonly expiry?: number
}

/**
 * 持久化狀態
 */
export interface PersistedState {
  /** 會話 ID */
  readonly conversationId: string | null
  /** 訊息列表（最近 N 條） */
  readonly messages: readonly ChatMessage[]
  /** 待發送訊息 */
  readonly pendingMessages: readonly ChatMessage[]
  /** 最後同步時間 */
  readonly lastSyncAt: number
  /** 會話上下文 */
  readonly context?: ConversationContext
}

// ==================== Validation 相關 ====================

/**
 * 驗證結果
 */
export interface ValidationResult {
  /** 是否通過驗證 */
  readonly success: boolean
  /** 驗證後的資料（成功時） */
  readonly data?: string
  /** 錯誤訊息（失敗時） */
  readonly error?: string
}
