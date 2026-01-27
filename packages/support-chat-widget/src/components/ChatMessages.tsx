import { useEffect, useRef } from 'react'
import type { ChatMessagesProps } from '../types'
import { ChatMessage } from './ChatMessage'

export function ChatMessages({ messages, isLoading, hasMore, onLoadMore }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
      {isLoading && messages.length === 0 && (
        <div className="text-center text-slate-400 text-sm">載入中...</div>
      )}

      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
    </div>
  )
}
