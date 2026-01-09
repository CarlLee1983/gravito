import { type ClassValue, clsx } from 'clsx'
import { Headset, MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ChatWidgetProps {
  apiBaseUrl: string
  wsUrl: string
  context?: {
    type: 'ORDER' | 'PRODUCT' | 'GENERAL'
    id?: string
    title?: string
  }
}

export function SupportChatWidget({ apiBaseUrl, wsUrl, context }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 初始化會話與 WebSocket
  useEffect(() => {
    const savedId = localStorage.getItem('gravito_support_sid')
    if (savedId) {
      setConversationId(savedId)
      // 這裡應從後台拉取歷史訊息
      setMessages([
        {
          id: 'init',
          sender: 'SUPPORT',
          content: '您好！歡迎回來，有什麼我可以幫您的嗎？',
          at: new Date(),
        },
      ])
    } else {
      setMessages([
        {
          id: 'init',
          sender: 'SUPPORT',
          content: '您好！我是您的線上客服，請問有什麼需要幫忙的嗎？',
          at: new Date(),
        },
      ])
    }
  }, [])

  // 捲動至底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  const handleSend = () => {
    if (!inputText.trim()) {
      return
    }

    const newMessage = {
      id: Date.now().toString(),
      sender: 'CUSTOMER',
      content: inputText,
      at: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputText('')

    // 如果是第一次發送，模擬建立會話
    if (!conversationId) {
      const newSid = `SESS-${Math.random().toString(36).substr(2, 9)}`
      setConversationId(newSid)
      localStorage.setItem('gravito_support_sid', newSid)
    }

    // 模擬客服自動回覆 (Demo 用)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          sender: 'SUPPORT',
          content: '收到您的訊息，正在為您查詢中，請稍候。',
          at: new Date(),
        },
      ])
    }, 1500)
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans text-slate-900">
      {/* 聊天視窗 */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[380px] h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <header className="bg-indigo-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Headset size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Gravito 線上客服</h3>
                <div className="flex items-center gap-1.5 text-[10px] opacity-80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 目前在線
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </header>

          {/* Context Banner */}
          {context && (
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-wider">
                {context.type}
              </div>
              <span className="text-[11px] text-slate-500 truncate font-medium">
                關於: {context.title || context.id}
              </span>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col max-w-[85%]',
                  msg.sender === 'CUSTOMER' ? 'ml-auto items-end' : 'mr-auto items-start'
                )}
              >
                <div
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm shadow-sm',
                    msg.sender === 'CUSTOMER'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 uppercase font-bold">
                  {msg.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>

          {/* Footer Input */}
          <footer className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white focus-within:border-indigo-200 border border-transparent transition-all">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                type="text"
                placeholder="輸入您的訊息..."
                className="flex-1 bg-transparent border-none outline-none text-sm py-1"
              />
              <button
                onClick={handleSend}
                type="button"
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                  inputText.trim()
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'text-slate-300'
                )}
              >
                <Send size={16} />
              </button>
            </div>
            <div className="mt-2 text-center">
              <span className="text-[9px] text-slate-300 flex items-center justify-center gap-1">
                Powered by Gravito Orbit
              </span>
            </div>
          </footer>
        </div>
      )}

      {/* 觸發按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 group',
          isOpen ? 'bg-slate-800 rotate-90' : 'bg-indigo-600 hover:scale-110 hover:bg-indigo-700'
        )}
      >
        {isOpen ? (
          <X className="text-white" size={24} />
        ) : (
          <div className="relative">
            <MessageCircle className="text-white" size={28} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-indigo-600 rounded-full animate-pulse" />
          </div>
        )}
      </button>
    </div>
  )
}
