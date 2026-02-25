/**
 * @fileoverview OrbitRipple x BunNativeAdapter 整合測試
 *
 * 驗證 Ripple WebSocket 與 BunNativeAdapter 的同一 Port 整合
 */

import type { PlanetCore } from '@gravito/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BunEngine } from '../src/engines/BunEngine'
import type { RippleSocket } from '../src/engines/IRippleEngine'
import { OrbitRipple } from '../src/OrbitRipple'
import { RippleServer } from '../src/RippleServer'

describe('OrbitRipple x BunNativeAdapter Integration', () => {
  let server: RippleServer

  beforeEach(() => {
    // 清除所有 mock
    vi.clearAllMocks()
  })

  afterEach(async () => {
    if (server) {
      await server.shutdown()
    }
  })

  // ============ BunEngine.getWebSocketConfig() 測試 ============

  describe('BunEngine.getWebSocketConfig()', () => {
    it('應回傳完整的 WebSocket handler 物件', () => {
      const engine = new BunEngine()
      const config = engine.getWebSocketConfig()

      expect(config).toBeDefined()
      expect(typeof config.open).toBe('function')
      expect(typeof config.message).toBe('function')
      expect(typeof config.close).toBe('function')
      expect(typeof config.drain).toBe('function')
    })

    it('open handler 應初始化 socket 並呼叫 connectionHandler', () => {
      const engine = new BunEngine()
      let connectedSocket: RippleSocket | undefined

      engine.onConnection((socket) => {
        connectedSocket = socket
      })

      const config = engine.getWebSocketConfig()
      const mockWs = {
        data: { id: 'test-id-123' },
      }

      config.open(mockWs)

      expect(connectedSocket).toBeDefined()
      expect(connectedSocket?.id).toBe('test-id-123')
    })

    it('message handler 應找到正確的 socket 並分發訊息', () => {
      const engine = new BunEngine()
      let receivedData: string | Uint8Array | undefined

      engine.onMessage((_socket, data) => {
        receivedData = data
      })

      const config = engine.getWebSocketConfig()
      const mockWs = {
        data: { id: 'test-id-456' },
      }

      // 先打開連接
      config.open(mockWs)

      // 發送訊息
      config.message(mockWs, 'hello')

      expect(receivedData).toBe('hello')
    })

    it('close handler 應移除 socket 並呼叫 disconnectionHandler', () => {
      const engine = new BunEngine()
      let disconnectedSocket: RippleSocket | undefined
      let disconnectedCode: number | undefined

      engine.onDisconnection((socket, code) => {
        disconnectedSocket = socket
        disconnectedCode = code
      })

      const config = engine.getWebSocketConfig()
      const mockWs = {
        data: { id: 'test-id-789' },
      }

      // 先打開連接
      config.open(mockWs)
      expect(disconnectedSocket).toBeUndefined()

      // 關閉連接
      config.close(mockWs, 1000, 'Normal closure')

      expect(disconnectedSocket).toBeDefined()
      expect(disconnectedSocket?.id).toBe('test-id-789')
      expect(disconnectedCode).toBe(1000)
    })

    it('drain handler 應無操作', () => {
      const engine = new BunEngine()
      const config = engine.getWebSocketConfig()

      // 應該不拋出錯誤
      expect(() => {
        config.drain(null)
      }).not.toThrow()
    })
  })

  // ============ RippleServer.getWebSocketConfig() 測試 ============

  describe('RippleServer.getWebSocketConfig()', () => {
    it('BunEngine 時應回傳 WebSocket handler 配置', () => {
      server = new RippleServer({ runtime: 'bun' })
      const config = server.getWebSocketConfig()

      expect(config).toBeDefined()
      expect(typeof config.open).toBe('function')
      expect(typeof config.message).toBe('function')
    })

    it('非 BunEngine 時應拋出錯誤', () => {
      server = new RippleServer({ runtime: 'node-ws' })

      expect(() => {
        server.getWebSocketConfig()
      }).toThrow('getWebSocketConfig() requires BunEngine')
    })
  })

  // ============ RippleServer.initDriver() 測試 ============

  describe('RippleServer.initDriver()', () => {
    it('應初始化 driver 和 serializer 但不啟動 engine', async () => {
      server = new RippleServer({ runtime: 'bun' })
      const spy = vi.spyOn(server as any, 'startPingInterval')

      await server.initDriver()

      expect(spy).toHaveBeenCalled()
    })

    it('應成功初始化且不拋出錯誤', async () => {
      server = new RippleServer({ runtime: 'bun' })

      await expect(server.initDriver()).resolves.toBeUndefined()
    })
  })

  // ============ OrbitRipple.install() 整合測試 ============

  describe('OrbitRipple.install() Integration', () => {
    it('應註冊 ripple 和 broadcast 到 container', async () => {
      const mockCore: Partial<PlanetCore> = {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        container: {
          instance: vi.fn(),
          get: vi.fn(),
        },
        adapter: {
          use: vi.fn(),
          registerWebSocketRoute: vi.fn(),
        },
        hooks: {
          doAction: vi.fn((_hook, _cb) => {
            // 不呼叫 cb
          }),
        },
      } as any

      const orbit = new OrbitRipple()
      orbit.install(mockCore as any)

      expect(mockCore.container?.instance).toHaveBeenCalledWith('ripple', expect.any(RippleServer))
      expect(mockCore.container?.instance).toHaveBeenCalledWith('broadcast', expect.anything())
    })

    it('應在 BunNativeAdapter 上呼叫 registerWebSocketRoute', async () => {
      const mockCore: Partial<PlanetCore> = {
        logger: { info: vi.fn() },
        container: { instance: vi.fn() },
        adapter: {
          use: vi.fn(),
          registerWebSocketRoute: vi.fn(),
        },
        hooks: {
          doAction: vi.fn(),
        },
      } as any

      const orbit = new OrbitRipple({ path: '/ws' })
      orbit.install(mockCore as any)

      // 等待非同步初始化
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockCore.adapter?.registerWebSocketRoute).toHaveBeenCalledWith(
        '/ws',
        expect.objectContaining({
          open: expect.any(Function),
          message: expect.any(Function),
          close: expect.any(Function),
        })
      )
    })

    it('應使用 initDriver() 而非 deprecated init()', async () => {
      const orbit = new OrbitRipple()
      const server = orbit.getServer()
      const spy = vi.spyOn(server, 'initDriver')

      const mockCore: Partial<PlanetCore> = {
        logger: { info: vi.fn() },
        container: { instance: vi.fn() },
        adapter: { use: vi.fn(), registerWebSocketRoute: vi.fn() },
        hooks: { doAction: vi.fn() },
      } as any

      orbit.install(mockCore as any)

      // 等待初始化
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(spy).toHaveBeenCalled()

      await server.shutdown()
    })

    it('非 BunNativeAdapter 時應回退到 start(wsPort)', async () => {
      const mockCore: Partial<PlanetCore> = {
        logger: { info: vi.fn() },
        container: { instance: vi.fn() },
        adapter: {
          use: vi.fn(),
          // 沒有 registerWebSocketRoute
        },
        hooks: { doAction: vi.fn() },
      } as any

      const orbit = new OrbitRipple({ port: 6001 })
      const server = orbit.getServer()

      // 注意：因為 start() 會真正啟動服務，我們只驗證邏輯流
      // 實際測試中應該 mock 掉 engine.listen()
      const startSpy = vi.spyOn(server, 'start')

      orbit.install(mockCore as any)

      // 等待初始化
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 因為沒有 registerWebSocketRoute，應該呼叫 start()
      expect(startSpy).toHaveBeenCalledWith(6001)

      startSpy.mockRestore()
      await server.shutdown()
    })

    it('應添加 middleware 注入 ripple 和 broadcast 到 context', () => {
      const mockCore: Partial<PlanetCore> = {
        logger: { info: vi.fn() },
        container: { instance: vi.fn() },
        adapter: { use: vi.fn(), registerWebSocketRoute: vi.fn() },
        hooks: { doAction: vi.fn() },
      } as any

      const orbit = new OrbitRipple()
      orbit.install(mockCore as any)

      expect(mockCore.adapter?.use).toHaveBeenCalledWith('*', expect.any(Function))
    })

    it('應在 core:shutdown 時呼叫 server.shutdown()', async () => {
      let shutdownCb: (() => Promise<void>) | undefined

      const mockCore: Partial<PlanetCore> = {
        logger: { info: vi.fn() },
        container: { instance: vi.fn() },
        adapter: { use: vi.fn(), registerWebSocketRoute: vi.fn() },
        hooks: {
          doAction: vi.fn((hook, cb) => {
            if (hook === 'core:shutdown') {
              shutdownCb = cb
            }
          }),
        },
      } as any

      const orbit = new OrbitRipple()
      const server = orbit.getServer()
      const shutdownSpy = vi.spyOn(server, 'shutdown')

      orbit.install(mockCore as any)

      expect(shutdownCb).toBeDefined()
      await shutdownCb?.()

      expect(shutdownSpy).toHaveBeenCalled()
    })
  })

  // ============ WebSocket Message 邊界情況 ============

  describe('WebSocket Message Handling (Edge Cases)', () => {
    it('message handler 應忽略不存在的 socket', () => {
      const engine = new BunEngine()
      let handlerCalled = false

      engine.onMessage(() => {
        handlerCalled = true
      })

      const config = engine.getWebSocketConfig()
      const mockWs = {
        data: { id: 'nonexistent-socket' },
      }

      // 不先打開連接，直接發送訊息
      config.message(mockWs, 'hello')

      // Handler 不應該被呼叫
      expect(handlerCalled).toBe(false)
    })

    it('close handler 應忽略不存在的 socket', () => {
      const engine = new BunEngine()
      let handlerCalled = false

      engine.onDisconnection(() => {
        handlerCalled = true
      })

      const config = engine.getWebSocketConfig()
      const mockWs = {
        data: { id: 'nonexistent-socket' },
      }

      // 不先打開連接，直接關閉
      config.close(mockWs, 1000, 'Normal')

      // Handler 不應該被呼叫
      expect(handlerCalled).toBe(false)
    })

    it('應支援二進制訊息', () => {
      const engine = new BunEngine()
      let receivedData: string | Uint8Array | undefined

      engine.onMessage((_socket, data) => {
        receivedData = data
      })

      const config = engine.getWebSocketConfig()
      const mockWs = {
        data: { id: 'test-binary' },
      }

      config.open(mockWs)

      // 發送二進制訊息
      const binaryData = new Uint8Array([1, 2, 3])
      config.message(mockWs, binaryData)

      expect(receivedData).toBeInstanceOf(Uint8Array)
      expect(receivedData).toEqual(binaryData)
    })
  })
})
