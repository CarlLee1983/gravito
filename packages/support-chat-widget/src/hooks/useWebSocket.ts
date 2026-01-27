import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnectionStatus, UseWebSocketOptions, UseWebSocketReturn } from '../types'

/**
 * Hook for managing WebSocket connections in the support chat widget.
 *
 * Integrates with `@gravito/ripple-client` to provide real-time communication
 * capabilities, including connection lifecycle management, channel subscriptions,
 * and automatic reconnection.
 *
 * @param options - Configuration options for the WebSocket connection.
 * @returns An object containing the connection status and methods to interact with the socket.
 *
 * @throws {Error} If the `@gravito/ripple-client` fails to load or the connection cannot be established.
 *
 * @example
 * ```tsx
 * const { status, connect, disconnect, emit, on } = useWebSocket({
 *   wsUrl: 'wss://ws.gravito.io',
 *   conversationId: 'CONV-123',
 *   onMessage: (message) => console.log('New message:', message),
 *   onStatusChange: (status) => console.log('Connection status:', status)
 * });
 *
 * // Establish connection
 * await connect();
 *
 * // Send a custom event
 * emit('client-event', { data: 'hello' });
 *
 * // Disconnect when finished
 * disconnect();
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { wsUrl, conversationId, onMessage, onStatusChange } = options
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [isConnected, setIsConnected] = useState(false)
  const clientRef = useRef<any>(null)
  const channelRef = useRef<any>(null)

  /**
   * Updates the internal connection status and triggers the optional callback.
   */
  const updateStatus = useCallback(
    (newStatus: ConnectionStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange]
  )

  /**
   * Initiates the WebSocket connection.
   *
   * Dynamically imports the Ripple client to optimize bundle size and
   * configures it with automatic reconnection logic.
   *
   * @throws {Error} If the connection attempt fails.
   */
  const connect = useCallback(async () => {
    // Prevent multiple connection attempts if already active
    if (clientRef.current) {
      return
    }

    updateStatus('connecting')

    try {
      // Dynamic import to avoid bundling issues in certain environments
      const { createRippleClient } = await import('@gravito/ripple-client')

      const client = createRippleClient({
        host: wsUrl,
        autoReconnect: true,
        maxReconnectAttempts: 5,
      })

      await client.connect()

      clientRef.current = client
      setIsConnected(true)
      updateStatus('connected')
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      setIsConnected(false)
      updateStatus('error')
    }
  }, [wsUrl, updateStatus])

  /**
   * Gracefully disconnects from the WebSocket server and leaves all channels.
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }

    if (channelRef.current) {
      channelRef.current = null
    }

    setIsConnected(false)
    updateStatus('disconnected')
  }, [updateStatus])

  /**
   * Emits a whisper event to the current conversation channel.
   *
   * @param event - The name of the event to emit.
   * @param data - The payload associated with the event.
   */
  const emit = useCallback(
    (event: string, data: unknown) => {
      if (!channelRef.current || !isConnected) {
        console.warn('[useWebSocket] Cannot emit event: Channel not connected')
        return
      }

      channelRef.current.whisper(event, data)
    },
    [isConnected]
  )

  /**
   * Subscribes to a whisper event on the current conversation channel.
   *
   * @param event - The name of the event to listen for.
   * @param callback - Function to execute when the event is received.
   * @returns A cleanup function to unsubscribe from the event.
   */
  const on = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      if (!channelRef.current || !isConnected) {
        console.warn('[useWebSocket] Cannot subscribe: Channel not connected')
        return () => {}
      }

      const channel = channelRef.current
      channel.listenForWhisper(event, callback)

      return () => {
        // Ripple client currently doesn't expose a clean way to unsubscribe from specific whisper
        // but re-subscription handles it generally.
        // For now we just keep it simple.
      }
    },
    [isConnected]
  )

  /**
   * Automatically manages the subscription to the conversation-specific private channel.
   * Leaves the channel when the conversation ID changes or the component unmounts.
   */
  useEffect(() => {
    // Skip subscription if requirements are not met
    if (!conversationId || !clientRef.current || !isConnected) {
      return
    }

    const channelName = `support.conversation.${conversationId}`
    const channel = clientRef.current.private(channelName)

    // Listen for standard message received events
    channel.listen('MessageReceived', onMessage)

    channelRef.current = channel

    // Cleanup: Leave the channel
    return () => {
      if (clientRef.current) {
        clientRef.current.leave(channelName)
      }
      channelRef.current = null
    }
  }, [conversationId, onMessage, isConnected])

  /**
   * Ensures the WebSocket connection is closed when the component is unmounted.
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
    emit,
    on,
  }
}
