import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCrossTabSync } from '../../src/hooks/useCrossTabSync'

// Mock BroadcastChannel with shared registry for cross-tab simulation
const channelRegistry = new Map<string, BroadcastChannelMock[]>()

class BroadcastChannelMock {
  name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  private listeners: ((event: MessageEvent) => void)[] = []

  constructor(name: string) {
    this.name = name
    // 註冊到共享 registry
    if (!channelRegistry.has(name)) {
      channelRegistry.set(name, [])
    }
    channelRegistry.get(name)!.push(this)
  }

  postMessage(message: unknown) {
    // 廣播到所有同名 channel（模擬跨 Tab）
    const event = new MessageEvent('message', { data: message })
    const channels = channelRegistry.get(this.name) || []
    for (const channel of channels) {
      for (const listener of channel.listeners) {
        listener(event)
      }
    }
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.push(listener)
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  close() {
    this.listeners = []
    // 從 registry 移除
    const channels = channelRegistry.get(this.name) || []
    const index = channels.indexOf(this)
    if (index > -1) {
      channels.splice(index, 1)
    }
  }
}

describe('useCrossTabSync', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    channelRegistry.clear()

    // Mock BroadcastChannel
    globalThis.BroadcastChannel = BroadcastChannelMock as any
  })

  it('應該返回初始值', () => {
    const { result } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    expect(result.current[0]).toBe('initial')
  })

  it('應該更新值', () => {
    const { result } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')
  })

  it('應該通過 BroadcastChannel 同步值', () => {
    const { result: result1 } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))
    const { result: result2 } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    act(() => {
      result1.current[1]('synced')
    })

    // result2 應該收到同步的值
    expect(result2.current[0]).toBe('synced')
  })

  it('應該在沒有 BroadcastChannel 時使用 localStorage fallback', () => {
    // 移除 BroadcastChannel 支援
    const originalBroadcastChannel = globalThis.BroadcastChannel
    // @ts-expect-error - Testing fallback
    delete globalThis.BroadcastChannel

    const { result } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    act(() => {
      result.current[1]('fallback')
    })

    const stored = localStorage.getItem('gravito_support_sync_test_key')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).value).toBe('fallback')

    // 恢復
    globalThis.BroadcastChannel = originalBroadcastChannel
  })

  it('應該監聽 localStorage 事件（fallback）', () => {
    const originalBroadcastChannel = globalThis.BroadcastChannel
    // @ts-expect-error - Testing fallback
    delete globalThis.BroadcastChannel

    const { result } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    // 模擬 storage 事件
    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'gravito_support_sync_test_key',
        newValue: JSON.stringify({
          value: 'from_storage',
          timestamp: Date.now(),
        }),
      })
      window.dispatchEvent(storageEvent)
    })

    expect(result.current[0]).toBe('from_storage')

    // 恢復
    globalThis.BroadcastChannel = originalBroadcastChannel
  })

  it('應該處理無效的 localStorage 值', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const originalBroadcastChannel = globalThis.BroadcastChannel
    // @ts-expect-error - Testing fallback
    delete globalThis.BroadcastChannel

    const { result } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    // 模擬無效 JSON
    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'gravito_support_sync_test_key',
        newValue: 'invalid json',
      })
      window.dispatchEvent(storageEvent)
    })

    expect(result.current[0]).toBe('initial') // 保持原值
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
    globalThis.BroadcastChannel = originalBroadcastChannel
  })

  it('應該在 unmount 時清理 BroadcastChannel', () => {
    const { unmount } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    const closeSpy = vi.spyOn(BroadcastChannelMock.prototype, 'close')

    unmount()

    expect(closeSpy).toHaveBeenCalled()
  })
})
