import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCrossTabSync } from '../../src/hooks/useCrossTabSync'

// Mock BroadcastChannel with shared registry
const channelRegistry = new Map<string, Set<any>>()

class BroadcastChannelMock {
  name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  private listeners: Record<string, Set<Function>> = {}

  constructor(name: string) {
    this.name = name
    const channels = channelRegistry.get(name) || new Set()
    channels.add(this)
    channelRegistry.set(name, channels)
  }

  postMessage(data: any) {
    const channels = channelRegistry.get(this.name)
    channels?.forEach((channel) => {
      if (channel !== this) {
        if (channel.onmessage) {
          channel.onmessage({ data } as MessageEvent)
        }
        channel.listeners.message?.forEach((cb: Function) => {
          cb({ data })
        })
      }
    })
  }

  addEventListener(type: string, callback: Function) {
    if (!this.listeners[type]) {
      this.listeners[type] = new Set()
    }
    this.listeners[type].add(callback)
  }

  removeEventListener(type: string, callback: Function) {
    this.listeners[type]?.delete(callback)
  }

  close() {
    const channels = channelRegistry.get(this.name)
    channels?.delete(this)
  }
}

describe('useCrossTabSync', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    channelRegistry.clear()

    // Mock BroadcastChannel
    vi.stubGlobal('BroadcastChannel', BroadcastChannelMock)
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

  it('應該在多個實例間同步', () => {
    const { result: result1 } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))
    const { result: result2 } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    act(() => {
      result1.current[1]('synced')
    })

    expect(result1.current[0]).toBe('synced')
    expect(result2.current[0]).toBe('synced')
  })

  it('應該在沒有 BroadcastChannel 時使用 localStorage fallback', () => {
    // 移除 BroadcastChannel 支援
    vi.stubGlobal('BroadcastChannel', undefined)

    const { result } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    act(() => {
      result.current[1]('fallback')
    })

    const stored = localStorage.getItem('gravito_support_sync_test_key')
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!).value).toBe('fallback')

    vi.unstubAllGlobals()
  })

  it('應該監聽 localStorage 事件（fallback）', () => {
    vi.stubGlobal('BroadcastChannel', undefined)

    const { result } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

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

    vi.unstubAllGlobals()
  })

  it('應該處理無效的 localStorage 值', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('BroadcastChannel', undefined)

    const { result } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    act(() => {
      const storageEvent = new StorageEvent('storage', {
        key: 'gravito_support_sync_test_key',
        newValue: 'invalid-json',
      })
      window.dispatchEvent(storageEvent)
    })

    // 不應該改變值
    expect(result.current[0]).toBe('initial')
    expect(consoleErrorSpy).toHaveBeenCalled()

    vi.unstubAllGlobals()
    consoleErrorSpy.mockRestore()
  })

  it('應該在 unmount 時清理 BroadcastChannel', () => {
    const { unmount } = renderHook(() => useCrossTabSync<string>('test_key', 'initial'))

    const closeSpy = vi.spyOn(BroadcastChannelMock.prototype, 'close')

    unmount()

    expect(closeSpy).toHaveBeenCalled()
  })
})
