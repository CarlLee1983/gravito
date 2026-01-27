// 導出類型
export type * from './types'

// 導出主組件
export { SupportChatWidget } from './components/ChatWidget'

// 導出子組件
export { ChatHeader } from './components/ChatHeader'
export { ChatMessages } from './components/ChatMessages'
export { ChatMessage } from './components/ChatMessage'
export { ChatInput } from './components/ChatInput'
export { ChatTrigger } from './components/ChatTrigger'
export { ConnectionStatus } from './components/ConnectionStatus'
export { ErrorBoundary } from './components/ErrorBoundary'
export { VirtualMessageList } from './components/VirtualMessageList'

// 導出 Hooks
export { useWebSocket } from './hooks/useWebSocket'
export { useMessages } from './hooks/useMessages'
export { useErrorHandler } from './hooks/useErrorHandler'
export { useVirtualScroll } from './hooks/useVirtualScroll'

// 導出工具函數
export { cn } from './utils/cn'
export { secureStorage } from './utils/storage'
export { validateMessageContent, validateConversationId } from './utils/validation'
export { sanitizeHtml, sanitizeUrl } from './utils/sanitize'

// 導出 API
export { createSupportApi } from './api/supportApi'
export type { SupportApi, SupportApiConfig } from './api/supportApi'
