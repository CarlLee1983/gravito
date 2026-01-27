import { useCallback, useEffect, useState } from 'react'

/**
 * A hook that synchronizes state across multiple browser tabs or windows.
 *
 * It uses the `BroadcastChannel` API for real-time synchronization and falls back
 * to `localStorage` events for older browsers. This ensures that state changes
 * in one tab are immediately reflected in all other open tabs of the same origin.
 *
 * @param key - The unique storage key used for synchronization.
 * @param initialValue - The initial value of the state.
 * @returns A tuple containing the current value and a function to update it.
 *
 * @example
 * ```tsx
 * const [conversationId, setConversationId] = useCrossTabSync<string | null>(
 *   'conversation_id',
 *   null
 * );
 *
 * // Updating the value in one tab will trigger an update in all other tabs.
 * const handleUpdate = () => {
 *   setConversationId('CONV-123');
 * };
 * ```
 */
export function useCrossTabSync<T>(key: string, initialValue: T): readonly [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue)
  const [channel] = useState<BroadcastChannel | null>(() => {
    // Check for BroadcastChannel support
    if (typeof BroadcastChannel !== 'undefined') {
      return new BroadcastChannel(`gravito_support_${key}`)
    }
    return null
  })

  /**
   * Updates the local state and broadcasts the change to other tabs.
   *
   * @param newValue - The new value to set and synchronize.
   */
  const updateValue = useCallback(
    (newValue: T) => {
      setValue(newValue)

      // Synchronize using BroadcastChannel if available
      if (channel) {
        channel.postMessage({
          key,
          value: newValue,
          timestamp: Date.now(),
        })
      } else {
        // Fallback: Use localStorage events
        localStorage.setItem(
          `gravito_support_sync_${key}`,
          JSON.stringify({
            value: newValue,
            timestamp: Date.now(),
          })
        )
      }
    },
    [channel, key]
  )

  /**
   * Listen for updates from other tabs.
   */
  useEffect(() => {
    if (channel) {
      // Use BroadcastChannel
      const handleMessage = (event: MessageEvent) => {
        if (event.data.key === key) {
          setValue(event.data.value)
        }
      }

      channel.addEventListener('message', handleMessage)

      return () => {
        channel.removeEventListener('message', handleMessage)
      }
    }

    // Fallback: Use localStorage storage event
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `gravito_support_sync_${key}` && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue)
          setValue(parsed.value)
        } catch (error) {
          console.error('[CrossTabSync] Failed to parse storage value:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [channel, key])

  /**
   * Cleanup the BroadcastChannel on unmount.
   */
  useEffect(() => {
    return () => {
      channel?.close()
    }
  }, [channel])

  return [value, updateValue] as const
}
