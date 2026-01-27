import type { ChatMessageProps } from '../types'
import { cn } from '../utils/cn'

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isCustomer = message.sender === 'CUSTOMER'

  return (
    <div
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
}
