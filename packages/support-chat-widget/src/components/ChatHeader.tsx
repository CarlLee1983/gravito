import { memo } from 'react'
import { Headset, X } from 'lucide-react'
import type { ChatHeaderProps } from '../types'

/**
 * 聊天視窗標題列組件
 *
 * 使用 React.memo 進行記憶化優化。
 */
export const ChatHeader = memo(function ChatHeader({ onClose, connectionStatus }: ChatHeaderProps) {
  return (
    <header className="bg-indigo-600 p-5 text-white flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
          <Headset size={20} />
        </div>
        <div>
          <h3 className="font-bold text-sm">Gravito 線上客服</h3>
          <div className="flex items-center gap-1.5 text-[10px] opacity-80">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-slate-400'
              }`}
            />
            {connectionStatus === 'connected' ? '目前在線' : '離線'}
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        type="button"
        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
      >
        <X size={20} />
      </button>
    </header>
  )
})
