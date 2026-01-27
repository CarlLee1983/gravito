import { useMemo } from 'react'
import { useChatWidget } from '../hooks/useChatWidget'
import type { ChatWidgetProps } from '../types'
import { cn } from '../utils/cn'
import { ChatHeader } from './ChatHeader'
import { ChatInput } from './ChatInput'
import { ChatMessages } from './ChatMessages'
import { ChatTrigger } from './ChatTrigger'
import { ConnectionStatus } from './ConnectionStatus'
import { ContextBanner } from './ContextBanner'

/**
 * 客服聊天小工具主組件
 *
 * 使用 useChatWidget 整合 Hook，簡化組件邏輯。
 */
export function SupportChatWidget(props: ChatWidgetProps) {
  const { className, context } = props

  // 使用整合 Hook
  const {
    isOpen,
    messages,
    connectionStatus,
    isLoading,
    error,
    isTyping,
    close,
    toggle,
    sendMessage,
    clearError,
    retry,
    hasMore,
    loadMore,
  } = useChatWidget(props)

  // 記憶化排序後的訊息列表
  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [messages])

  return (
    <div className={cn('fixed bottom-6 right-6 z-[9999] font-sans', className)}>
      {/* 聊天視窗 */}
      {isOpen && (
        <div
          data-testid="chat-window"
          className="absolute bottom-20 right-0 w-[380px] h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        >
          <ChatHeader
            onClose={close}
            connectionStatus={connectionStatus}
            agentName={isTyping ? '客服輸入中...' : undefined}
          />

          {context && <ContextBanner context={context} />}

          {connectionStatus === 'error' && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100">
              <ConnectionStatus status={connectionStatus} onRetry={retry} />
            </div>
          )}

          <ChatMessages
            messages={sortedMessages}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />

          {error && (
            <div className="px-4 py-2 bg-red-50 text-red-600 text-sm flex justify-between items-center">
              <span>{error.message}</span>
              <button onClick={clearError} className="text-red-700 underline text-xs" type="button">
                關閉
              </button>
            </div>
          )}

          <ChatInput
            onSend={sendMessage}
            disabled={connectionStatus === 'disconnected' && isLoading}
          />
        </div>
      )}

      <ChatTrigger onClick={toggle} hasUnread={false} isOpen={isOpen} />
    </div>
  )
}
