import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Options for the auto-scroll hook.
 */
export interface UseAutoScrollOptions {
  /** Dependencies that trigger an automatic scroll check (e.g., message list) */
  readonly dependency: unknown[]
  /** Scrolling behavior (smooth or instant) */
  readonly behavior?: ScrollBehavior
  /** Pixel distance from bottom within which auto-scroll is triggered */
  readonly threshold?: number
}

/**
 * Return value for the auto-scroll hook.
 */
export interface UseAutoScrollReturn {
  /** Reference to the scrollable container element */
  readonly containerRef: React.RefObject<HTMLDivElement | null>
  /** Function to manually trigger a scroll to bottom */
  readonly scrollToBottom: () => void
  /** Whether the user is currently at the bottom of the container */
  readonly isAtBottom: boolean
}

/**
 * Hook for managing automatic scrolling behavior in a message container.
 *
 * Monitors a list of dependencies and automatically scrolls to the bottom
 * if the user was already near the bottom. This provides a natural chat
 * experience where new messages pull the view down unless the user has scrolled up.
 *
 * @param options - Configuration for auto-scroll logic.
 * @returns Container reference and scrolling state/methods.
 *
 * @example
 * ```tsx
 * const { containerRef, isAtBottom } = useAutoScroll({
 *   dependency: [messages],
 *   threshold: 100
 * });
 *
 * return (
 *   <div ref={containerRef} style={{ overflowY: 'auto' }}>
 *     {messages.map(msg => <div key={msg.id}>{msg.text}</div>)}
 *   </div>
 * );
 * ```
 */
export function useAutoScroll(options: UseAutoScrollOptions): UseAutoScrollReturn {
  const { dependency, behavior = 'smooth', threshold = 50 } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  /**
   * Scrolls the container to the absolute bottom.
   */
  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return

    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior,
    })
  }, [behavior])

  /**
   * Checks if the container's current scroll position is within the threshold of the bottom.
   *
   * @returns True if at or near the bottom.
   */
  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return false

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    return distanceFromBottom <= threshold
  }, [threshold])

  /**
   * Updates the 'isAtBottom' state based on the current scroll position.
   */
  const handleScroll = useCallback(() => {
    setIsAtBottom(checkIfAtBottom())
  }, [checkIfAtBottom])

  /**
   * Triggers an automatic scroll to bottom when dependencies change,
   * but only if the user was already at the bottom.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: Static dependency tracking via spread is intentional here
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom()
    }
  }, [...dependency, isAtBottom, scrollToBottom])

  /**
   * Sets up and cleans up scroll event listeners.
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  return {
    containerRef,
    scrollToBottom,
    isAtBottom,
  }
}
