import { useState } from 'react'
import type { ChatWidgetProps } from '../types'
import { ChatTrigger } from './ChatTrigger'
import { ChatHeader } from './ChatHeader'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { ContextBanner } from './ContextBanner'
import { useWebSocket } from '../hooks/useWebSocket'
import { useMessages } from '../hooks/useMessages'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { secureStorage } from '../utils/storage'
import { cn } from '../utils/cn'

/**
 * 客服聊天小工具主組件
 */
export function SupportChatWidget(props: ChatWidgetProps) {
  const { apiBaseUrl, wsUrl, context, className, defaultOpen = false, onOpenChange, onConnectionChange } = props

  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [conversationId, setConversationId] = useState<string | null>(() =>
    secureStorage.get<string>('conversation_id')
  )

  const { error, handleError, clearError } = useErrorHandler()

  const { messages, sendMessage, isLoading } = useMessages({
    apiBaseUrl,
    conversationId,
  })

  const { status: connectionStatus, connect } = useWebSocket({
    wsUrl,
    conversationId,
    onMessage: (message) => {
      // 訊息會透過 WebSocket 實時接收
      console.log('接收到訊息:', message)
    },
    onStatusChange: onConnectionChange,
  })

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    onOpenChange?.(newState)

    // 開啟時連接 WebSocket
    if (newState && conversationId) {
      connect()
    }
  }

  const handleSend = async (content: string) => {
    try {
      await sendMessage(content)
    } catch (err) {
      handleError(err as Error)
    }
  }

  return (
    <div className={cn('fixed bottom-6 right-6 z-[9999] font-sans', className)}>
      {/* 聊天視窗 */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[380px] h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
          <ChatHeader
            onClose={handleToggle}
            connectionStatus={connectionStatus}
          />

          {context && <ContextBanner context={context} />}

          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            hasMore={false}
          />

          {error && (
            <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
              {error.message}
              <button onClick={clearError} className="ml-2 underline">
                關閉
              </button>
            </div>
          )}

          <ChatInput onSend={handleSend} />
        </div>
      )}

      <ChatTrigger onClick={handleToggle} hasUnread={false} isOpen={isOpen} />
    </div>
  )
}
