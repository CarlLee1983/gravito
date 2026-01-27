import { memo } from 'react'
import type { ChatMessagesProps } from '../types'
import { VirtualMessageList } from './VirtualMessageList'

/**
 * 聊天訊息列表組件
 *
 * 使用 VirtualMessageList 進行虛擬滾動優化，支援大量訊息。
 * 使用 React.memo 進行記憶化優化。
 */
export const ChatMessages = memo(function ChatMessages({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
}: ChatMessagesProps) {
  // 當沒有訊息且正在載入時顯示載入中
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30 flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">載入中...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden bg-slate-50/30 flex flex-col">
      <VirtualMessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        estimatedItemHeight={80}
      />
    </div>
  )
})
