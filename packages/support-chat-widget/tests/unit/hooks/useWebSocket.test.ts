import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWebSocket } from '../../../src/hooks/useWebSocket'
import type { ChatMessage } from '../../../src/types'

// Mock ripple-client
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockPrivate = vi.fn()
const mockListen = vi.fn()
const mockLeave = vi.fn()

vi.mock('@gravito/ripple-client', () => ({
  createRippleClient: vi.fn(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    private: mockPrivate,
    leave: mockLeave,
  })),
}))

describe('useWebSocket', () => {
  const wsUrl = 'wss://test.com'
  const conversationId = 'CONV-123'
  const onMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockConnect.mockResolvedValue(undefined)
    mockPrivate.mockReturnValue({
      listen: mockListen,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('初始狀態應該是 disconnected', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId: null,
        onMessage,
      })
    )

    expect(result.current.status).toBe('disconnected')
  })

  it('應該能夠連接 WebSocket', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
      })
    )

    await act(async () => {
      await result.current.connect()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('connected')
    })

    expect(mockConnect).toHaveBeenCalled()
  })

  it('連接時應該更新狀態為 connecting', async () => {
    const onStatusChange = vi.fn()

    // 使用控制的 Promise 而不是 setTimeout，防止 CI 延時問題
    let resolveConnect: (value: void | PromiseLike<void>) => void
    const connectPromiseControlled = new Promise<void>((resolve) => {
      resolveConnect = resolve
    })
    mockConnect.mockImplementationOnce(() => connectPromiseControlled)

    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
        onStatusChange,
      })
    )

    let connectPromise: Promise<void>
    await act(async () => {
      connectPromise = result.current.connect()
    })

    // 等待狀態更新為 connecting
    await waitFor(() => {
      expect(result.current.status).toBe('connecting')
    })

    expect(onStatusChange).toHaveBeenCalledWith('connecting')

    await act(async () => {
      resolveConnect?.()
      await connectPromise
    })

    // 最終應該是 connected
    await waitFor(() => {
      expect(result.current.status).toBe('connected')
    })
  })

  it('連接失敗時應該設置狀態為 error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'))

    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
      })
    )

    // connect() 內部會 catch 錯誤，所以不需要 await 拋出的 Promise
    await act(async () => {
      await result.current.connect().catch(() => {})
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('有會話 ID 時應該訂閱頻道', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
      })
    )

    await act(async () => {
      await result.current.connect()
    })

    await waitFor(() => {
      expect(mockPrivate).toHaveBeenCalledWith(`support.conversation.${conversationId}`)
      expect(mockListen).toHaveBeenCalledWith('MessageReceived', expect.any(Function))
    })
  })

  it('沒有會話 ID 時不應該訂閱頻道', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId: null,
        onMessage,
      })
    )

    await act(async () => {
      await result.current.connect()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('connected')
    })

    expect(mockPrivate).not.toHaveBeenCalled()
  })

  it('接收到訊息時應該調用 onMessage', async () => {
    let messageHandler: ((message: ChatMessage) => void) | undefined

    mockListen.mockImplementation((event: string, handler: (message: ChatMessage) => void) => {
      if (event === 'MessageReceived') {
        messageHandler = handler
      }
    })

    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
      })
    )

    await act(async () => {
      await result.current.connect()
    })

    await waitFor(() => {
      expect(messageHandler).toBeDefined()
    })

    const mockMessage: ChatMessage = {
      id: 'MSG-1',
      conversationId,
      sender: 'SUPPORT',
      content: 'Hello',
      status: 'sent',
      createdAt: new Date(),
    }

    await act(async () => {
      messageHandler?.(mockMessage)
    })

    expect(onMessage).toHaveBeenCalledWith(mockMessage)
  })

  it('應該能夠斷開連接', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
      })
    )

    await act(async () => {
      await result.current.connect()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('connected')
    })

    await act(async () => {
      result.current.disconnect()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('disconnected')
      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  it('會話 ID 改變時應該重新訂閱', async () => {
    const { result, rerender } = renderHook(
      ({ convId }) =>
        useWebSocket({
          wsUrl,
          conversationId: convId,
          onMessage,
        }),
      {
        initialProps: { convId: 'CONV-1' },
      }
    )

    await act(async () => {
      await result.current.connect()
    })

    // 等待連接建立和頻道訂閱
    await waitFor(() => {
      expect(result.current.status).toBe('connected')
    })

    await waitFor(() => {
      expect(mockPrivate).toHaveBeenCalledWith('support.conversation.CONV-1')
    })

    // 更改會話 ID
    await act(async () => {
      rerender({ convId: 'CONV-2' })
    })

    await waitFor(() => {
      expect(mockLeave).toHaveBeenCalledWith('support.conversation.CONV-1')
      expect(mockPrivate).toHaveBeenCalledWith('support.conversation.CONV-2')
    })
  })

  it('組件卸載時應該清理連接', async () => {
    const { result, unmount } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
      })
    )

    await act(async () => {
      await result.current.connect()
    })

    await act(async () => {
      unmount()
    })

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('重複調用 connect 不應該建立多個連接', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
      })
    )

    await act(async () => {
      await result.current.connect()
      await result.current.connect()
      await result.current.connect()
    })

    // 應該只調用一次
    expect(mockConnect).toHaveBeenCalledTimes(1)
  })
})
