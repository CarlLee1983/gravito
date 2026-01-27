// 導出類型

export type { SupportApi, SupportApiConfig } from './api/supportApi'
// 導出 API
export { createSupportApi } from './api/supportApi'

// 導出子組件
export { ChatHeader } from './components/ChatHeader'
export { ChatInput } from './components/ChatInput'
export { ChatMessage } from './components/ChatMessage'
export { ChatMessages } from './components/ChatMessages'
export { ChatTrigger } from './components/ChatTrigger'
// 導出主組件
export { SupportChatWidget } from './components/ChatWidget'
export { ConnectionStatus } from './components/ConnectionStatus'
export { ErrorBoundary } from './components/ErrorBoundary'
export { VirtualMessageList } from './components/VirtualMessageList'
export { useErrorHandler } from './hooks/useErrorHandler'
export { useMessages } from './hooks/useMessages'
export { useVirtualScroll } from './hooks/useVirtualScroll'
// 導出 Hooks
export { useWebSocket } from './hooks/useWebSocket'
export type * from './types'
// 導出工具函數
export { cn } from './utils/cn'
export { sanitizeHtml, sanitizeUrl } from './utils/sanitize'
export { secureStorage } from './utils/storage'
export { validateConversationId, validateMessageContent } from './utils/validation'
