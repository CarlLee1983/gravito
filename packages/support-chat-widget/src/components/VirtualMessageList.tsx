import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useVirtualScroll } from '../hooks/useVirtualScroll'
import type { ChatMessage as ChatMessageType } from '../types'
import { ChatMessage } from './ChatMessage'

/**
 * VirtualMessageList 組件的 Props
 */
export interface VirtualMessageListProps {
  /** 訊息列表 */
  readonly messages: readonly ChatMessageType[]
  /** 載入更多訊息 */
  readonly onLoadMore?: () => void
  /** 是否還有更多訊息 */
  readonly hasMore: boolean
  /** 預估項目高度 (px) */
  readonly estimatedItemHeight?: number
  /** 是否正在載入 */
  readonly isLoading?: boolean
}

/**
 * 虛擬訊息列表組件
 *
 * 使用虛擬滾動技術，只渲染可見區域的訊息，支援大量訊息（10000+）而不影響效能。
 *
 * @example
 * ```tsx
 * <VirtualMessageList
 *   messages={messages}
 *   onLoadMore={loadMore}
 *   hasMore={hasMore}
 *   estimatedItemHeight={80}
 * />
 * ```
 */
export const VirtualMessageList = memo(function VirtualMessageList({
  messages,
  onLoadMore,
  hasMore,
  estimatedItemHeight = 80,
  isLoading = false,
}: VirtualMessageListProps) {
  const [containerHeight, setContainerHeight] = useState(400)
  const heightCacheRef = useRef<Map<string, number>>(new Map())
  const measureElementsRef = useRef<Map<string, HTMLDivElement>>(new Map())

  /**
   * 獲取訊息高度（使用快取）
   */
  const getItemHeight = useCallback(
    (index: number): number => {
      const message = messages[index]
      if (!message) {
        return estimatedItemHeight
      }

      const cached = heightCacheRef.current.get(message.id)
      if (cached) {
        return cached
      }

      return estimatedItemHeight
    },
    [messages, estimatedItemHeight]
  )

  /**
   * 使用虛擬滾動
   */
  const { virtualItems, totalHeight, scrollToIndex, containerProps, containerRef } =
    useVirtualScroll({
      itemCount: messages.length,
      itemHeight: getItemHeight,
      containerHeight,
      overscan: 3,
    })

  /**
   * 測量元素實際高度
   */
  const measureElement = useCallback((messageId: string, element: HTMLDivElement | null) => {
    if (!element) {
      measureElementsRef.current.delete(messageId)
      return
    }

    measureElementsRef.current.set(messageId, element)

    // 使用 ResizeObserver 監聽高度變化
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height
        if (height > 0) {
          heightCacheRef.current.set(messageId, height)
        }
      }
    })

    observer.observe(element)

    // 清理函數
    return () => {
      observer.disconnect()
    }
  }, [])

  /**
   * 監聽容器大小變化
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height
      if (height > 0) {
        setContainerHeight(height)
      }
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [containerRef])

  /**
   * 檢測是否接近頂部（觸發載入更多）
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container || !onLoadMore || !hasMore || isLoading) {
      return
    }

    const handleScroll = () => {
      // 當滾動到距離頂部 100px 內時，觸發載入更多
      if (container.scrollTop < 100) {
        onLoadMore()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef, onLoadMore, hasMore, isLoading])

  /**
   * 當訊息數量增加時，滾動到底部
   */
  const prevMessageCountRef = useRef(messages.length)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      // 延遲一點確保新訊息已渲染
      setTimeout(() => {
        scrollToIndex(messages.length - 1, { align: 'end' })
      }, 100)
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length, scrollToIndex])

  return (
    <div
      ref={containerRef}
      {...containerProps}
      className="flex-1 overflow-y-auto overflow-x-hidden"
    >
      {/* 載入中指示器 */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="ml-2 text-sm text-gray-500">載入中...</span>
        </div>
      )}

      {/* 虛擬列表容器 */}
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const message = messages[virtualItem.index]
          if (!message) {
            return null
          }

          return (
            <div
              key={message.id}
              ref={(el) => measureElement(message.id, el)}
              style={{
                position: 'absolute',
                top: virtualItem.start,
                left: 0,
                right: 0,
                minHeight: virtualItem.size,
              }}
            >
              <ChatMessage message={message} />
            </div>
          )
        })}
      </div>

      {/* 空狀態 */}
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>尚無訊息</p>
        </div>
      )}
    </div>
  )
})
