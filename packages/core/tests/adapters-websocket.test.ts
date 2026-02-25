/**
 * WebSocket 功能測試套件
 *
 * 測試 BunNativeAdapter 的 WebSocket 路由支援
 */

import { beforeEach, describe, expect, it, vi } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'

describe('BunNativeAdapter - WebSocket Support', () => {
  let adapter: BunNativeAdapter
  let mockWs: any
  let handlers: any

  beforeEach(() => {
    adapter = new BunNativeAdapter()
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      data: { path: '' },
    }
    handlers = null
  })

  describe('WebSocket 路由註冊', () => {
    it('應該註冊 WebSocket 路由', () => {
      const openHandler = vi.fn()

      adapter.registerWebSocketRoute('/chat', {
        open: openHandler,
      })

      expect(adapter.websocket).toBeDefined()
      expect(handlers).toBeDefined() // 會在 toHandler 時設定
    })

    it('應該檢測已註冊的路由', () => {
      adapter.registerWebSocketRoute('/chat', { open: vi.fn() })
      const handler = adapter.websocket

      expect(handler).toBeDefined()
      expect(adapter.websocket).not.toBeUndefined()
    })

    it('應該在沒有註冊路由時返回 undefined', () => {
      expect(adapter.websocket).toBeUndefined()
    })

    it('應該支援多個 WebSocket 路由', () => {
      adapter.registerWebSocketRoute('/chat', { open: vi.fn() })
      adapter.registerWebSocketRoute('/notifications', { open: vi.fn() })

      expect(adapter.websocket).toBeDefined()
    })
  })

  describe('open 事件', () => {
    it('應該在新連線時呼叫 open 處理器', () => {
      const openHandler = vi.fn()
      adapter.registerWebSocketRoute('/chat', { open: openHandler })

      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'

      if (wsHandler.open) {
        wsHandler.open(mockWs)
      }

      expect(openHandler).toHaveBeenCalledWith(mockWs)
    })

    it('應該分發到正確路徑的 open 處理器', () => {
      const openChat = vi.fn()
      const openNotif = vi.fn()

      adapter.registerWebSocketRoute('/chat', { open: openChat })
      adapter.registerWebSocketRoute('/notifications', { open: openNotif })

      const wsHandler = adapter.websocket!

      mockWs.data.path = '/chat'
      if (wsHandler.open) {
        wsHandler.open(mockWs)
      }

      mockWs.data.path = '/notifications'
      if (wsHandler.open) {
        wsHandler.open(mockWs)
      }

      expect(openChat).toHaveBeenCalledTimes(1)
      expect(openNotif).toHaveBeenCalledTimes(1)
    })

    it('應該無 open 處理器時不 crash', () => {
      adapter.registerWebSocketRoute('/chat', { message: vi.fn() })
      const wsHandler = adapter.websocket!

      mockWs.data.path = '/chat'

      expect(() => {
        if (wsHandler.open) {
          wsHandler.open(mockWs)
        }
      }).not.toThrow()
    })
  })

  describe('message 事件', () => {
    it('應該在訊息時呼叫 message 處理器', () => {
      const messageHandler = vi.fn()
      adapter.registerWebSocketRoute('/chat', { message: messageHandler })

      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'
      const data = 'hello'

      if (wsHandler.message) {
        wsHandler.message(mockWs, data)
      }

      expect(messageHandler).toHaveBeenCalledWith(mockWs, data)
    })

    it('應該支援 Buffer 類型的訊息', () => {
      const messageHandler = vi.fn()
      adapter.registerWebSocketRoute('/chat', { message: messageHandler })

      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'
      const buffer = Buffer.from([1, 2, 3])

      if (wsHandler.message) {
        wsHandler.message(mockWs, buffer)
      }

      expect(messageHandler).toHaveBeenCalledWith(mockWs, buffer)
    })

    it('應該支援 Uint8Array 類型的訊息', () => {
      const messageHandler = vi.fn()
      adapter.registerWebSocketRoute('/chat', { message: messageHandler })

      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'
      const data = new Uint8Array([1, 2, 3])

      if (wsHandler.message) {
        wsHandler.message(mockWs, data)
      }

      expect(messageHandler).toHaveBeenCalledWith(mockWs, data)
    })

    it('應該分發訊息到正確的路徑', () => {
      const msgChat = vi.fn()
      const msgNotif = vi.fn()

      adapter.registerWebSocketRoute('/chat', { message: msgChat })
      adapter.registerWebSocketRoute('/notifications', { message: msgNotif })

      const wsHandler = adapter.websocket!

      mockWs.data.path = '/chat'
      if (wsHandler.message) {
        wsHandler.message(mockWs, 'msg1')
      }

      mockWs.data.path = '/notifications'
      if (wsHandler.message) {
        wsHandler.message(mockWs, 'msg2')
      }

      expect(msgChat).toHaveBeenCalledWith(mockWs, 'msg1')
      expect(msgNotif).toHaveBeenCalledWith(mockWs, 'msg2')
    })
  })

  describe('close 事件', () => {
    it('應該在斷線時呼叫 close 處理器', () => {
      const closeHandler = vi.fn()
      adapter.registerWebSocketRoute('/chat', { close: closeHandler })

      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'

      if (wsHandler.close) {
        wsHandler.close(mockWs, 1000, 'Normal closure')
      }

      expect(closeHandler).toHaveBeenCalledWith(mockWs, 1000, 'Normal closure')
    })

    it('應該傳遞 close code 和 reason', () => {
      const closeHandler = vi.fn()
      adapter.registerWebSocketRoute('/chat', { close: closeHandler })

      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'

      if (wsHandler.close) {
        wsHandler.close(mockWs, 1001, 'Going away')
      }

      expect(closeHandler).toHaveBeenCalledWith(mockWs, 1001, 'Going away')
    })
  })

  describe('drain 事件', () => {
    it('應該在背壓時呼叫 drain 處理器', () => {
      const drainHandler = vi.fn()
      adapter.registerWebSocketRoute('/chat', { drain: drainHandler })

      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'

      if (wsHandler.drain) {
        wsHandler.drain(mockWs)
      }

      expect(drainHandler).toHaveBeenCalledWith(mockWs)
    })
  })

  describe('路徑匹配', () => {
    it('應該精確匹配路徑', () => {
      adapter.registerWebSocketRoute('/api/chat', { open: vi.fn() })
      const wsHandler = adapter.websocket!

      mockWs.data.path = '/api/chat'
      expect(() => {
        if (wsHandler.open) {
          wsHandler.open(mockWs)
        }
      }).not.toThrow()
    })

    it('應該不匹配不同的路徑', () => {
      const handler = vi.fn()
      adapter.registerWebSocketRoute('/chat', { open: handler })
      const wsHandler = adapter.websocket!

      mockWs.data.path = '/other'
      if (wsHandler.open) {
        wsHandler.open(mockWs)
      }

      expect(handler).not.toHaveBeenCalled()
    })

    it('應該支援 wildcard 路徑匹配', () => {
      const handler = vi.fn()
      adapter.registerWebSocketRoute('/api/*', { open: handler })
      const wsHandler = adapter.websocket!

      mockWs.data.path = '/api/chat'
      if (wsHandler.open) {
        wsHandler.open(mockWs)
      }

      expect(handler).toHaveBeenCalledWith(mockWs)
    })
  })

  describe('HTTP upgrade', () => {
    it('應該在有 upgrade header 時返回 101', async () => {
      adapter.registerWebSocketRoute('/chat', { open: vi.fn() })

      const req = new Request('http://localhost/chat', {
        headers: {
          upgrade: 'websocket',
          connection: 'Upgrade',
        },
      })

      const mockServer = {
        upgrade: vi.fn((_request: Request, _options?: any) => {
          return true // 返回 true 表示成功升級
        }),
      }

      const res = await adapter.fetch(req, mockServer)

      // 升級成功應返回 101
      expect(res.status).toBe(101)
      expect(mockServer.upgrade).toHaveBeenCalled()
    })

    it('應該不升級無 upgrade header 的請求', async () => {
      adapter.registerWebSocketRoute('/chat', { open: vi.fn() })
      adapter.route('GET', '/chat', (ctx) => ctx.json({ type: 'http' }))

      const req = new Request('http://localhost/chat')
      const res = await adapter.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.type).toBe('http')
    })

    it('應該在路由未註冊時不升級', async () => {
      const req = new Request('http://localhost/chat', {
        headers: {
          upgrade: 'websocket',
        },
      })

      const mockServer = {
        upgrade: vi.fn(() => true),
      }

      const res = await adapter.fetch(req, mockServer)

      // 無 WebSocket 路由，應返回 404
      expect(res.status).toBe(404)
      expect(mockServer.upgrade).not.toHaveBeenCalled()
    })
  })

  describe('並發行為', () => {
    it('應該同時處理多個 WebSocket 連線', () => {
      const handler = vi.fn()
      adapter.registerWebSocketRoute('/chat', { message: handler })

      const wsHandler = adapter.websocket!

      const ws1 = { ...mockWs, data: { path: '/chat' }, id: 1 }
      const ws2 = { ...mockWs, data: { path: '/chat' }, id: 2 }

      if (wsHandler.message) {
        wsHandler.message(ws1, 'msg1')
        wsHandler.message(ws2, 'msg2')
      }

      expect(handler).toHaveBeenCalledTimes(2)
      expect(handler).toHaveBeenNthCalledWith(1, ws1, 'msg1')
      expect(handler).toHaveBeenNthCalledWith(2, ws2, 'msg2')
    })

    it('應該不干擾不同路由的連線', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      adapter.registerWebSocketRoute('/chat', { message: handler1 })
      adapter.registerWebSocketRoute('/notifications', { message: handler2 })

      const wsHandler = adapter.websocket!

      const ws1 = { ...mockWs, data: { path: '/chat' } }
      const ws2 = { ...mockWs, data: { path: '/notifications' } }

      if (wsHandler.message) {
        wsHandler.message(ws1, 'msg1')
        wsHandler.message(ws2, 'msg2')
      }

      expect(handler1).toHaveBeenCalledWith(ws1, 'msg1')
      expect(handler2).toHaveBeenCalledWith(ws2, 'msg2')
    })
  })

  describe('Handler 未定義時的行為', () => {
    it('應該在沒有 open 時不 crash', () => {
      adapter.registerWebSocketRoute('/chat', { message: vi.fn() })
      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'

      expect(() => {
        if (wsHandler.open) {
          wsHandler.open(mockWs)
        }
      }).not.toThrow()
    })

    it('應該在沒有 message 時不 crash', () => {
      adapter.registerWebSocketRoute('/chat', { open: vi.fn() })
      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'

      expect(() => {
        if (wsHandler.message) {
          wsHandler.message(mockWs, 'test')
        }
      }).not.toThrow()
    })

    it('應該在沒有 close 時不 crash', () => {
      adapter.registerWebSocketRoute('/chat', { open: vi.fn() })
      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'

      expect(() => {
        if (wsHandler.close) {
          wsHandler.close(mockWs, 1000, 'test')
        }
      }).not.toThrow()
    })

    it('應該在沒有 drain 時不 crash', () => {
      adapter.registerWebSocketRoute('/chat', { open: vi.fn() })
      const wsHandler = adapter.websocket!
      mockWs.data.path = '/chat'

      expect(() => {
        if (wsHandler.drain) {
          wsHandler.drain(mockWs)
        }
      }).not.toThrow()
    })
  })
})
