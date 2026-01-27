import { cleanup, renderHook, waitFor } from '@testing-library/react'
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

    await result.current.connect()

    await waitFor(() => {
      expect(result.current.status).toBe('connected')
    })

    expect(mockConnect).toHaveBeenCalled()
  })

  it('連接時應該更新狀態為 connecting', async () => {
    const onStatusChange = vi.fn()

    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
        onStatusChange,
      })
    )

    const connectPromise = result.current.connect()

    // 應該立即變成 connecting
    expect(result.current.status).toBe('connecting')
    expect(onStatusChange).toHaveBeenCalledWith('connecting')

    await connectPromise
  })

  it('連接失敗時應該設置狀態為 error', async () => {
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'))

    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
      })
    )

    await result.current.connect()

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })
  })

  it('有會話 ID 時應該訂閱頻道', async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        wsUrl,
        conversationId,
        onMessage,
      })
    )

    await result.current.connect()

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

    await result.current.connect()

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

    await result.current.connect()

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

    messageHandler?.(mockMessage)

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

    await result.current.connect()
    result.current.disconnect()

    await waitFor(() => {
      expect(result.current.status).toBe('disconnected')
    })

    expect(mockDisconnect).toHaveBeenCalled()
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

    await result.current.connect()

    await waitFor(() => {
      expect(mockPrivate).toHaveBeenCalledWith('support.conversation.CONV-1')
    })

    // 更改會話 ID
    rerender({ convId: 'CONV-2' })

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

    await result.current.connect()

    unmount()

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

    await result.current.connect()
    await result.current.connect()
    await result.current.connect()

    // 應該只調用一次
    expect(mockConnect).toHaveBeenCalledTimes(1)
  })
})
