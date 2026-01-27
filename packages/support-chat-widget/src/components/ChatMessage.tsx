import { memo } from 'react'
import type { ChatMessageProps } from '../types'
import { cn } from '../utils/cn'

/**
 * 聊天訊息氣泡組件
 *
 * 使用 React.memo 進行記憶化優化，避免不必要的重新渲染。
 * 只有當訊息 ID 或狀態改變時才重新渲染。
 */
export const ChatMessage = memo(
  function ChatMessage({ message, onRetry }: ChatMessageProps) {
    const isCustomer = message.sender === 'CUSTOMER'

    return (
      <div
        data-testid="chat-message"
        className={cn(
          'flex flex-col max-w-[85%]',
          isCustomer ? 'ml-auto items-end' : 'mr-auto items-start'
        )}
      >
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm shadow-sm',
            isCustomer
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
          )}
        >
          {message.content}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-slate-400 uppercase font-bold">
            {message.createdAt.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {message.status === 'failed' && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[9px] text-rose-500 hover:underline"
            >
              重試
            </button>
          )}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // 自訂比較函數：只在 ID 或狀態改變時重新渲染
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.message.content === nextProps.message.content
    )
  }
)
