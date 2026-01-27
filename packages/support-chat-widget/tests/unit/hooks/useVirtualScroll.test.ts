import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useVirtualScroll } from '../../../src/hooks/useVirtualScroll'

describe('useVirtualScroll', () => {
  beforeEach(() => {
    // 模擬容器元素
  })

  afterEach(() => {
    cleanup()
  })

  it('初始狀態應該正確', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        itemHeight: 60,
        containerHeight: 400,
        overscan: 5,
      })
    )

    expect(result.current.virtualItems).toBeInstanceOf(Array)
    expect(result.current.totalHeight).toBe(6000) // 100 * 60
    expect(result.current.containerRef).toBeDefined()
    expect(result.current.scrollToIndex).toBeInstanceOf(Function)
  })

  it('應該計算正確的虛擬項目列表', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        itemHeight: 60,
        containerHeight: 400,
        overscan: 2,
      })
    )

    // 初始時應該渲染可見範圍 + overscan 的項目
    expect(result.current.virtualItems.length).toBeGreaterThan(0)

    // 每個虛擬項目應該有正確的屬性
    const firstItem = result.current.virtualItems[0]
    expect(firstItem).toHaveProperty('index')
    expect(firstItem).toHaveProperty('start')
    expect(firstItem).toHaveProperty('end')
    expect(firstItem).toHaveProperty('size')
    expect(firstItem.size).toBe(60)
  })

  it('應該支援動態高度函數', () => {
    const getItemHeight = (index: number) => {
      // 奇數項目高度 80，偶數項目高度 60
      return index % 2 === 0 ? 60 : 80
    }

    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 10,
        itemHeight: getItemHeight,
        containerHeight: 400,
      })
    )

    // 總高度應該是所有項目高度的總和
    // 0: 60, 1: 80, 2: 60, 3: 80, ... = 5 * 60 + 5 * 80 = 700
    expect(result.current.totalHeight).toBe(700)
  })

  it('空列表時應該返回空虛擬項目', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 0,
        itemHeight: 60,
        containerHeight: 400,
      })
    )

    expect(result.current.virtualItems).toEqual([])
    expect(result.current.totalHeight).toBe(0)
  })

  it('容器高度為 0 時應該返回空虛擬項目', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        itemHeight: 60,
        containerHeight: 0,
      })
    )

    expect(result.current.virtualItems).toEqual([])
  })

  it('應該提供 containerProps', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        itemHeight: 60,
        containerHeight: 400,
      })
    )

    expect(result.current.containerProps).toHaveProperty('onScroll')
    expect(result.current.containerProps).toHaveProperty('style')
    expect(result.current.containerProps.style).toMatchObject({
      height: 400,
      overflow: 'auto',
      position: 'relative',
    })
  })

  it('itemCount 變化時應該重新計算', () => {
    const { result, rerender } = renderHook(
      ({ count }) =>
        useVirtualScroll({
          itemCount: count,
          itemHeight: 60,
          containerHeight: 400,
        }),
      {
        initialProps: { count: 10 },
      }
    )

    const initialTotalHeight = result.current.totalHeight
    expect(initialTotalHeight).toBe(600) // 10 * 60

    // 更改 itemCount
    rerender({ count: 20 })

    expect(result.current.totalHeight).toBe(1200) // 20 * 60
  })

  it('overscan 應該影響虛擬項目數量', () => {
    const { result: result1 } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        itemHeight: 60,
        containerHeight: 400,
        overscan: 0,
      })
    )

    const { result: result2 } = renderHook(() =>
      useVirtualScroll({
        itemCount: 100,
        itemHeight: 60,
        containerHeight: 400,
        overscan: 10,
      })
    )

    // overscan 越大，虛擬項目數量應該越多
    expect(result2.current.virtualItems.length).toBeGreaterThan(result1.current.virtualItems.length)
  })
})
