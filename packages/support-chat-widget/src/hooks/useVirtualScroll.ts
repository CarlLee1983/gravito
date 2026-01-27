import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * 虛擬項目資訊
 */
export interface VirtualItem {
  /** 項目索引 */
  readonly index: number
  /** 起始位置 (px) */
  readonly start: number
  /** 結束位置 (px) */
  readonly end: number
  /** 項目大小 (px) */
  readonly size: number
}

/**
 * 虛擬滾動選項
 */
export interface VirtualScrollOptions {
  /** 項目總數 */
  readonly itemCount: number
  /** 項目高度（固定值或函數） */
  readonly itemHeight: number | ((index: number) => number)
  /** 容器高度 */
  readonly containerHeight: number
  /** 預渲染的項目數（上下各預渲染幾個） */
  readonly overscan?: number
}

/**
 * 虛擬滾動回傳值
 */
export interface VirtualScrollReturn {
  /** 可見的虛擬項目列表 */
  readonly virtualItems: readonly VirtualItem[]
  /** 總高度 */
  readonly totalHeight: number
  /** 滾動到指定索引 */
  readonly scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void
  /** 容器 Props */
  readonly containerProps: {
    readonly onScroll: (e: React.UIEvent<HTMLElement>) => void
    readonly style: React.CSSProperties
  }
  /** 容器 Ref */
  readonly containerRef: React.RefObject<HTMLDivElement | null>
}

/**
 * 虛擬滾動 Hook
 *
 * 實現高效的虛擬滾動，只渲染可見區域的項目。
 *
 * @param options - 虛擬滾動選項
 * @returns 虛擬滾動狀態和方法
 *
 * @example
 * ```tsx
 * const { virtualItems, totalHeight, containerProps, containerRef } = useVirtualScroll({
 *   itemCount: 10000,
 *   itemHeight: 60,
 *   containerHeight: 400,
 *   overscan: 5
 * })
 *
 * return (
 *   <div ref={containerRef} {...containerProps}>
 *     <div style={{ height: totalHeight, position: 'relative' }}>
 *       {virtualItems.map(item => (
 *         <div
 *           key={item.index}
 *           style={{
 *             position: 'absolute',
 *             top: item.start,
 *             width: '100%',
 *             height: item.size
 *           }}
 *         >
 *           Item {item.index}
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * )
 * ```
 */
export function useVirtualScroll(options: VirtualScrollOptions): VirtualScrollReturn {
  const { itemCount, itemHeight, containerHeight, overscan = 5 } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  /**
   * 獲取項目高度
   */
  const getItemHeight = useCallback(
    (index: number): number => {
      if (typeof itemHeight === 'function') {
        return itemHeight(index)
      }
      return itemHeight
    },
    [itemHeight]
  )

  /**
   * 計算總高度和項目位置
   */
  const { totalHeight, itemPositions } = useMemo(() => {
    const positions: number[] = []
    let currentPosition = 0

    for (let i = 0; i < itemCount; i++) {
      positions.push(currentPosition)
      currentPosition += getItemHeight(i)
    }

    return {
      totalHeight: currentPosition,
      itemPositions: positions,
    }
  }, [itemCount, getItemHeight])

  /**
   * 計算可見項目範圍
   */
  const virtualItems = useMemo((): readonly VirtualItem[] => {
    if (itemCount === 0 || containerHeight === 0) {
      return []
    }

    const items: VirtualItem[] = []
    const viewportStart = scrollTop
    const viewportEnd = scrollTop + containerHeight

    // 使用二分搜尋找到起始索引
    let startIndex = 0
    let endIndex = itemCount - 1

    while (startIndex <= endIndex) {
      const mid = Math.floor((startIndex + endIndex) / 2)
      const itemStart = itemPositions[mid]
      const itemEnd = itemStart + getItemHeight(mid)

      if (itemEnd < viewportStart) {
        startIndex = mid + 1
      } else if (itemStart > viewportEnd) {
        endIndex = mid - 1
      } else {
        // 找到第一個可見項目
        startIndex = mid
        break
      }
    }

    // 向前搜尋確保找到第一個可見項目
    while (startIndex > 0) {
      const prevIndex = startIndex - 1
      const prevStart = itemPositions[prevIndex]
      const prevEnd = prevStart + getItemHeight(prevIndex)
      if (prevEnd < viewportStart) break
      startIndex = prevIndex
    }

    // 應用 overscan
    const rangeStart = Math.max(0, startIndex - overscan)
    const rangeEnd = Math.min(
      itemCount - 1,
      startIndex + Math.ceil(containerHeight / getItemHeight(startIndex)) + overscan
    )

    // 生成虛擬項目列表
    for (let index = rangeStart; index <= rangeEnd; index++) {
      const start = itemPositions[index]
      const size = getItemHeight(index)

      items.push({
        index,
        start,
        end: start + size,
        size,
      })
    }

    return items
  }, [itemCount, containerHeight, scrollTop, itemPositions, getItemHeight, overscan])

  /**
   * 處理滾動事件
   */
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget
    setScrollTop(target.scrollTop)
  }, [])

  /**
   * 滾動到指定索引
   */
  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'start' | 'center' | 'end' }) => {
      if (!containerRef.current || index < 0 || index >= itemCount) {
        return
      }

      const align = options?.align ?? 'start'
      const itemStart = itemPositions[index]
      const itemSize = getItemHeight(index)

      let scrollTo = itemStart

      if (align === 'center') {
        scrollTo = itemStart - (containerHeight - itemSize) / 2
      } else if (align === 'end') {
        scrollTo = itemStart - containerHeight + itemSize
      }

      // 確保滾動位置在有效範圍內
      scrollTo = Math.max(0, Math.min(scrollTo, totalHeight - containerHeight))

      containerRef.current.scrollTo({
        top: scrollTo,
        behavior: 'smooth',
      })
    },
    [itemCount, itemPositions, getItemHeight, containerHeight, totalHeight]
  )

  /**
   * 當 itemCount 變化時，滾動到底部（用於新訊息）
   */
  const prevItemCountRef = useRef(itemCount)
  useEffect(() => {
    if (itemCount > prevItemCountRef.current && containerRef.current) {
      // 如果已經接近底部，自動滾動到新訊息
      const isNearBottom = scrollTop + containerHeight >= totalHeight - 100
      if (isNearBottom) {
        scrollToIndex(itemCount - 1, { align: 'end' })
      }
    }
    prevItemCountRef.current = itemCount
  }, [itemCount, scrollTop, containerHeight, totalHeight, scrollToIndex])

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
    containerProps: {
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      },
    },
    containerRef,
  }
}
