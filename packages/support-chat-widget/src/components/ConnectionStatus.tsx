import type { ConnectionStatusProps } from '../types'

export function ConnectionStatus({ status, onRetry }: ConnectionStatusProps) {
  if (status === 'connected') return null

  const messages = {
    connecting: '正在連線...',
    disconnected: '已斷線',
    error: '連線錯誤',
  }

  return (
    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
      <span className="text-xs text-amber-700">{messages[status]}</span>
      {onRetry && status === 'error' && (
        <button onClick={onRetry} className="text-xs text-amber-600 hover:underline">
          重試
        </button>
      )}
    </div>
  )
}
