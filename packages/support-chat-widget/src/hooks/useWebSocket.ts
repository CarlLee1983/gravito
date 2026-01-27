import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnectionStatus, UseWebSocketOptions, UseWebSocketReturn } from '../types'

/**
 * WebSocket 連線管理 Hook
 *
 * 整合 @gravito/ripple-client 實現 WebSocket 實時通信，
 * 包含連線狀態管理、頻道訂閱、自動重連等功能。
 *
 * @param options - WebSocket 選項
 * @returns WebSocket 狀態和操作方法
 *
 * @example
 * ```tsx
 * const { status, connect, disconnect } = useWebSocket({
 *   wsUrl: 'wss://ws.gravito.io',
 *   conversationId: 'CONV-123',
 *   onMessage: (message) => {
 *     console.log('收到訊息:', message)
 *   },
 *   onStatusChange: (status) => {
 *     console.log('連線狀態:', status)
 *   }
 * })
 *
 * // 連接
 * await connect()
 *
 * // 斷開
 * disconnect()
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { wsUrl, conversationId, onMessage, onStatusChange } = options
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const clientRef = useRef<any>(null)
  const channelRef = useRef<any>(null)

  /**
   * 更新連線狀態
   */
  const updateStatus = useCallback(
    (newStatus: ConnectionStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange]
  )

  /**
   * 連接 WebSocket
   */
  const connect = useCallback(async () => {
    // 如果已經有連接，不重複建立
    if (clientRef.current) {
      return
    }

    updateStatus('connecting')

    try {
      // 動態 import ripple-client（避免打包問題）
      const { createRippleClient } = await import('@gravito/ripple-client')

      const client = createRippleClient({
        host: wsUrl,
        autoReconnect: true,
        maxReconnectAttempts: 5,
      })

      await client.connect()

      clientRef.current = client
      updateStatus('connected')
    } catch (error) {
      console.error('WebSocket 連線失敗:', error)
      updateStatus('error')
    }
  }, [wsUrl, updateStatus])

  /**
   * 斷開 WebSocket
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }

    if (channelRef.current) {
      channelRef.current = null
    }

    updateStatus('disconnected')
  }, [updateStatus])

  /**
   * 訂閱會話頻道
   */
  useEffect(() => {
    // 沒有會話 ID 或沒有客戶端，不訂閱
    if (!conversationId || !clientRef.current) {
      return
    }

    const channelName = `support.conversation.${conversationId}`
    const channel = clientRef.current.private(channelName)

    // 監聽訊息事件
    channel.listen('MessageReceived', onMessage)

    channelRef.current = channel

    // 清理函數：離開頻道
    return () => {
      if (clientRef.current) {
        clientRef.current.leave(channelName)
      }
      channelRef.current = null
    }
  }, [conversationId, onMessage])

  /**
   * 組件卸載時清理連接
   */
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    status,
    connect,
    disconnect,
  }
}
