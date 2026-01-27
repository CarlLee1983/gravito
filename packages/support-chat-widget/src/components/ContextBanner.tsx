import { memo } from 'react'
import type { ContextBannerProps } from '../types'

/**
 * 上下文橫幅組件
 *
 * 使用 React.memo 進行記憶化優化。
 */
export const ContextBanner = memo(function ContextBanner({ context, onDismiss }: ContextBannerProps) {
  return (
    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
      <div className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-wider">
        {context.type}
      </div>
      <span className="text-[11px] text-slate-500 truncate font-medium">
        關於: {context.title || context.id}
      </span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-auto text-slate-400 hover:text-slate-600">
          ×
        </button>
      )}
    </div>
  )
})
