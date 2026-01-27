import { Send } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import type { ChatInputProps } from '../types'
import { cn } from '../utils/cn'

/**
 * 聊天輸入框組件
 *
 * 使用 React.memo 和 useCallback 進行記憶化優化。
 */
export const ChatInput = memo(function ChatInput({
  onSend,
  disabled,
  placeholder = '輸入您的訊息...',
  maxLength = 2000,
}: ChatInputProps) {
  const [text, setText] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (text.trim() && !disabled) {
        onSend(text.trim())
        setText('')
      }
    },
    [text, disabled, onSend]
  )

  return (
    <footer className="p-4 bg-white border-t border-slate-100">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white focus-within:border-indigo-200 border border-transparent transition-all">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            type="text"
            data-testid="chat-input"
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-sm py-1"
          />
          <button
            type="submit"
            data-testid="chat-send"
            disabled={!text.trim() || disabled}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
              text.trim() && !disabled
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-300'
            )}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
      <div className="mt-2 text-center">
        <span className="text-[9px] text-slate-300">Powered by Gravito Orbit</span>
      </div>
    </footer>
  )
})
