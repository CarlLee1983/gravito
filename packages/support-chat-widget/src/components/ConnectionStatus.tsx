import { memo, useMemo } from 'react'
import type { ConnectionStatusProps } from '../types'

/**
 * 連線狀態指示組件
 *
 * 使用 React.memo 和 useMemo 進行記憶化優化。
 */
export const ConnectionStatus = memo(function ConnectionStatus({
  status,
  onRetry,
}: ConnectionStatusProps) {
  const messages = useMemo(
    () => ({
      connecting: '正在連線...',
      disconnected: '已斷線',
      error: '連線錯誤',
    }),
    []
  )

  if (status === 'connected') {
    return null
  }

  return (
    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
      <span className="text-xs text-amber-700">{messages[status as keyof typeof messages]}</span>
      {onRetry && status === 'error' && (
        <button onClick={onRetry} className="text-xs text-amber-600 hover:underline" type="button">
          重試
        </button>
      )}
    </div>
  )
})
