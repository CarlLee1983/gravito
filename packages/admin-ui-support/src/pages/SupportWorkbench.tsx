import { useAdmin } from '@gravito/admin-shell-react'
import { type ClassValue, clsx } from 'clsx'
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  MoreVertical,
  Search,
  Send,
  Tag,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function SupportWorkbench() {
  const { sdk } = useAdmin()
  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')

  useEffect(() => {
    async function loadInbox() {
      const data = await sdk.api.get<any[]>('/support/inbox')
      setSessions(data)
      if (data.length > 0) {
        setActiveSession(data[0])
      }
    }
    loadInbox()
  }, [sdk])

  useEffect(() => {
    if (activeSession) {
      // 這裡應訂閱 Ripple 頻道
      // ripple.subscribe(`private-support.chat.${activeSession.id}`)
      setMessages([
        { id: '1', sender: 'CUSTOMER', content: '您好，我對這張訂單有疑問', at: new Date() },
      ])
    }
  }, [activeSession])

  const handleSend = () => {
    if (!inputText.trim()) {
      return
    }
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'SUPPORT', content: inputText, at: new Date() },
    ])
    setInputText('')
  }

  return (
    <div className="h-[calc(100vh-160px)] flex bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-100/50">
      {/* 左側：會話清單 */}
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="搜尋對話..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setActiveSession(session)}
              className={cn(
                'w-full p-4 flex items-start gap-3 transition-all text-left group',
                activeSession?.id === session.id
                  ? 'bg-white border-l-4 border-indigo-600 shadow-sm'
                  : 'hover:bg-slate-50'
              )}
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                <User size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-slate-900 truncate">{session.participant}</span>
                  <span className="text-[10px] text-slate-400">10m</span>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight border',
                      session.contextType === 'ORDER'
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                        : session.contextType === 'FORM'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                    )}
                  >
                    {session.contextType}
                  </span>
                  {session.contextId && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {session.contextId}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate italic">
                  "{session.subject || '無主旨諮詢'}"
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 右側：聊天主區 */}
      <div className="flex-1 flex flex-col bg-white">
        {activeSession ? (
          <>
            <header className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {activeSession.participant[0]}
                </div>
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    {activeSession.participant}
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} /> 對話建立於 {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                  title="標記為已結案"
                >
                  <CheckCircle2 size={20} />
                </button>
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </header>

            {/* 上下文資訊列 (Context Bar) */}
            {activeSession.contextType === 'ORDER' && (
              <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-indigo-700">
                  <Tag size={14} />
                  本會話關聯訂單:{' '}
                  <span className="font-bold font-mono">{activeSession.contextId}</span>
                </div>
                <button
                  type="button"
                  className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                >
                  查看訂單詳情 <ExternalLink size={10} />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">
              {messages.map((msg, _i) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col max-w-[80%]',
                    msg.sender === 'SUPPORT' ? 'ml-auto items-end' : 'mr-auto items-start'
                  )}
                >
                  <div
                    className={cn(
                      'px-4 py-3 rounded-2xl text-sm shadow-sm',
                      msg.sender === 'SUPPORT'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    )}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1.5 font-medium">
                    {msg.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>

            <footer className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-2 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  type="text"
                  placeholder="輸入訊息並按 Enter 發送..."
                  className="flex-1 bg-transparent border-none outline-none px-2 py-1 text-sm"
                />
                <button
                  onClick={handleSend}
                  type="button"
                  className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
              <MessageSquare size={40} className="opacity-20" />
            </div>
            <p className="text-sm font-medium">請從左側選擇一個對話開始</p>
          </div>
        )}
      </div>
    </div>
  )
}
