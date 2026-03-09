import { useCallback, useEffect, useRef, useState } from 'react'
import type { UseTypingStatusOptions, UseTypingStatusReturn } from '../types'

/**
 * Hook for managing typing indicators in the chat widget.
 *
 * Handles both outgoing typing notifications (user to agent) and incoming
 * typing status (agent to user). Includes automatic timeout logic to clear
 * the typing status after a period of inactivity.
 *
 * @param options - Configuration options for typing status management.
 * @returns Current typing state and notification methods.
 *
 * @throws {Error} If the WebSocket connection is not available when notifying.
 *
 * @example
 * ```tsx
 * const { isAgentTyping, notifyTyping } = useTypingStatus({
 *   conversationId: 'CONV-123',
 *   emit: socket.emit,
 *   on: socket.on,
 *   onTypingChange: (isTyping) => console.log('Agent typing:', isTyping)
 * });
 *
 * // Call this on input change
 * <input onChange={notifyTyping} />
 * ```
 */
export function useTypingStatus(options: UseTypingStatusOptions): UseTypingStatusReturn {
  const { conversationId, onTypingChange, emit, on } = options

  const [isAgentTyping, setIsAgentTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTypingChangeRef = useRef(onTypingChange)

  // Keep ref in sync
  useEffect(() => {
    onTypingChangeRef.current = onTypingChange
  }, [onTypingChange])

  /**
   * Notifies the support agent that the user is currently typing.
   *
   * This method should be called on every keystroke. It uses the WebSocket
   * `emit` function to send a 'typing' event to the server.
   */
  const notifyTyping = useCallback(() => {
    if (!conversationId || !emit) {
      return
    }

    emit('typing', { conversationId })
    console.log('[TypingStatus] User is typing:', conversationId)
  }, [conversationId, emit])

  /**
   * Subscribes to incoming typing events from the WebSocket.
   *
   * When a 'typing' event is received for the current conversation, it sets
   * `isAgentTyping` to true and starts a 3-second timer to automatically
   * reset the status if no further events are received.
   */
  useEffect(() => {
    if (!conversationId || !on) {
      setIsAgentTyping(false)
      return
    }

    const handleTyping = (data: unknown) => {
      // Verify the event belongs to the current conversation
      const payload = data as any
      if (payload?.conversationId && payload.conversationId !== conversationId) {
        return
      }

      setIsAgentTyping(true)
      onTypingChangeRef.current?.(true)

      // Reset the inactivity timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Automatically clear typing status after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsAgentTyping(false)
        onTypingChangeRef.current?.(false)
      }, 3000)
    }

    const unsubscribe = on('typing', handleTyping)

    // Cleanup subscription and timers
    return () => {
      unsubscribe?.()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      setIsAgentTyping(false)
    }
  }, [conversationId, on])

  /**
   * Ensures all timers are cleared when the component unmounts.
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return {
    isAgentTyping,
    notifyTyping,
  }
}
