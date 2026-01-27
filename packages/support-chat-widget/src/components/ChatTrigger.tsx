import { MessageCircle, X } from 'lucide-react'
import type { ChatTriggerProps } from '../types'
import { cn } from '../utils/cn'

export function ChatTrigger({ onClick, hasUnread, isOpen }: ChatTriggerProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500',
        isOpen ? 'bg-slate-800 rotate-90' : 'bg-indigo-600 hover:scale-110 hover:bg-indigo-700'
      )}
    >
      {isOpen ? (
        <X className="text-white" size={24} />
      ) : (
        <div className="relative">
          <MessageCircle className="text-white" size={28} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-indigo-600 rounded-full animate-pulse" />
          )}
        </div>
      )}
    </button>
  )
}
