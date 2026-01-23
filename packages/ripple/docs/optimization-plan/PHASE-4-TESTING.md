# 第 4 階段：測試覆蓋提升

> 達成 90%+ 測試覆蓋率，新增整合測試、壓力測試、E2E 測試

## 概覽

此階段專注於提升 ripple 模組的測試覆蓋率，填補現有測試缺口，並新增整合測試和壓力測試以確保模組在各種場景下的穩定性。

## 當前測試狀況分析

### 現有測試檔案

| 檔案 | 行數 | 覆蓋範圍 |
|------|------|----------|
| `ripple.test.ts` | 356 | Channel、ChannelManager、LocalDriver、RippleServer、BroadcastEvent |
| `redis-driver.test.ts` | ~100 | RedisDriver（使用 mock） |
| `mock-redis.ts` | ~80 | Redis mock 輔助 |

### 覆蓋缺口識別

| 元件 | 已覆蓋 | 缺少測試 |
|------|--------|----------|
| **RippleServer** | 70% | 初始化/關閉、錯誤恢復、邊界情況 |
| **RedisDriver** | 50% | 連接失敗、重連邏輯、發布失敗 |
| **Broadcaster** | 40% | 全域狀態測試、emit 邏輯 |
| **ChannelManager** | 80% | 並發操作、大量訂閱 |
| **整合測試** | 0% | 跨元件協作場景 |
| **E2E 測試** | 0% | 完整連接生命週期 |

### 未測試的程式碼路徑

**RippleServer.ts**：
- `init()` / `shutdown()` 完整流程
- `broadcastToClients()` 方法
- `handleDrain()` 回呼
- 授權失敗的各種情況
- 未訂閱頻道的 whisper

**RedisDriver.ts**：
- 連接超時處理
- 發布失敗重試
- 訂閱者錯誤恢復
- `shutdown()` 清理邏輯

**Broadcaster.ts**：
- `except()` 方法鏈
- `toPrivate()` / `toPresence()` 方法
- 無伺服器時的行為

---

## 測試策略

### 測試金字塔

```
         ┌─────────┐
         │   E2E   │  ← 少量，驗證完整流程
        ─┴─────────┴─
       ┌─────────────┐
       │  Integration │  ← 中量，驗證元件協作
      ─┴─────────────┴─
     ┌─────────────────┐
     │   Unit Tests    │  ← 大量，驗證單一功能
    ─┴─────────────────┴─
```

### 目標覆蓋率

| 指標 | 當前 | 目標 |
|------|------|------|
| 行覆蓋 | ~70% | 90%+ |
| 分支覆蓋 | ~60% | 85%+ |
| 函式覆蓋 | ~75% | 95%+ |

---

## 新增測試規劃

### 1. 單元測試補充

#### RippleServer 完整測試

```typescript
// tests/ripple-server.test.ts

describe('RippleServer', () => {
  describe('Initialization', () => {
    it('should initialize with local driver by default', async () => {
      const server = new RippleServer()
      await server.init()

      const stats = server.getStats()
      expect(stats).toBeDefined()

      await server.shutdown()
    })

    it('should initialize with redis driver when configured', async () => {
      const server = new RippleServer({
        driver: 'redis',
        redis: { host: 'localhost', port: 6379 },
      })

      // 使用 mock Redis
      await server.init()
      await server.shutdown()
    })

    it('should start ping interval on init', async () => {
      vi.useFakeTimers()
      const server = new RippleServer({ pingInterval: 1000 })
      await server.init()

      const mockWs = createMockWebSocket()
      server['channels'].addClient(mockWs)

      vi.advanceTimersByTime(1000)

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('pong')
      )

      await server.shutdown()
      vi.useRealTimers()
    })
  })

  describe('Shutdown', () => {
    it('should clear ping interval on shutdown', async () => {
      const server = new RippleServer({ pingInterval: 1000 })
      await server.init()

      const intervalId = server['pingInterval']
      expect(intervalId).toBeDefined()

      await server.shutdown()

      // 間隔應已清除
      expect(server['pingInterval']).toBeUndefined()
    })

    it('should call driver shutdown', async () => {
      const server = new RippleServer()
      await server.init()

      const shutdownSpy = vi.spyOn(server['driver'], 'shutdown')
      await server.shutdown()

      expect(shutdownSpy).toHaveBeenCalled()
    })
  })

  describe('Authorization', () => {
    it('should reject private channel when authorizer returns false', async () => {
      const server = new RippleServer({
        authorizer: async () => false,
      })
      const handler = server.getHandler()
      const messages: any[] = []

      const ws = createMockWebSocket((data) => {
        messages.push(JSON.parse(data))
      })

      handler.open(ws)
      await handler.message(ws, JSON.stringify({
        type: 'subscribe',
        channel: 'private-secret',
      }))

      expect(messages.some(m =>
        m.type === 'error' && m.message === 'Unauthorized'
      )).toBe(true)
    })

    it('should accept private channel when authorizer returns true', async () => {
      const server = new RippleServer({
        authorizer: async () => true,
      })
      const handler = server.getHandler()
      const messages: any[] = []

      const ws = createMockWebSocket((data) => {
        messages.push(JSON.parse(data))
      })

      handler.open(ws)
      await handler.message(ws, JSON.stringify({
        type: 'subscribe',
        channel: 'private-secret',
      }))

      expect(messages.some(m =>
        m.type === 'subscribed' && m.channel === 'private-secret'
      )).toBe(true)
    })
  })

  describe('Whisper', () => {
    it('should reject whisper to non-subscribed channel', async () => {
      const server = new RippleServer()
      const handler = server.getHandler()
      const messages: any[] = []

      const ws = createMockWebSocket((data) => {
        messages.push(JSON.parse(data))
      })

      handler.open(ws)
      await handler.message(ws, JSON.stringify({
        type: 'whisper',
        channel: 'not-subscribed',
        event: 'test',
        data: {},
      }))

      expect(messages.some(m =>
        m.type === 'error' && m.message === 'Not subscribed to channel'
      )).toBe(true)
    })
  })

  describe('Event Listeners', () => {
    it('should trigger registered event listeners', async () => {
      const server = new RippleServer()
      const handler = server.getHandler()
      const receivedData: any[] = []

      server.on('custom-event', (ws, data) => {
        receivedData.push({ socketId: ws.data.id, data })
      })

      const ws = createMockWebSocket()
      handler.open(ws)

      await handler.message(ws, JSON.stringify({
        type: 'subscribe',
        channel: 'test',
      }))

      await handler.message(ws, JSON.stringify({
        type: 'whisper',
        channel: 'test',
        event: 'custom-event',
        data: { foo: 'bar' },
      }))

      expect(receivedData.length).toBe(1)
      expect(receivedData[0].data).toEqual({ foo: 'bar' })
    })
  })

  describe('Broadcast Methods', () => {
    it('should broadcast to specific clients', async () => {
      const server = new RippleServer()
      const handler = server.getHandler()
      const messagesA: any[] = []
      const messagesB: any[] = []

      const wsA = createMockWebSocket((d) => messagesA.push(JSON.parse(d)))
      const wsB = createMockWebSocket((d) => messagesB.push(JSON.parse(d)))

      handler.open(wsA)
      handler.open(wsB)

      server.broadcastToClients([wsA.data.id], 'test-event', { data: 1 })

      expect(messagesA.some(m => m.event === 'test-event')).toBe(true)
      expect(messagesB.some(m => m.event === 'test-event')).toBe(false)
    })

    it('should support fluent to() API', async () => {
      const server = new RippleServer()
      const handler = server.getHandler()
      const messages: any[] = []

      const ws = createMockWebSocket((d) => messages.push(JSON.parse(d)))
      handler.open(ws)

      await handler.message(ws, JSON.stringify({
        type: 'subscribe',
        channel: 'chat',
      }))

      server.to('chat').emit('message', { text: 'hello' })

      expect(messages.some(m =>
        m.type === 'event' && m.event === 'message'
      )).toBe(true)
    })
  })
})
```

#### Broadcaster 完整測試

```typescript
// tests/broadcaster.test.ts

describe('Broadcaster', () => {
  describe('Static Methods', () => {
    beforeEach(() => {
      // 設定全域伺服器
      const server = new RippleServer()
      setRippleServer(server)
    })

    afterEach(() => {
      setRippleServer(null)
    })

    it('should create public channel broadcaster', () => {
      const broadcaster = Broadcaster.to('chat')
      expect(broadcaster['_channel']).toBe('chat')
    })

    it('should create private channel broadcaster', () => {
      const broadcaster = Broadcaster.toPrivate('orders.123')
      expect(broadcaster['_channel']).toBe('private-orders.123')
    })

    it('should create presence channel broadcaster', () => {
      const broadcaster = Broadcaster.toPresence('room.lobby')
      expect(broadcaster['_channel']).toBe('presence-room.lobby')
    })
  })

  describe('except()', () => {
    it('should add single socket ID to exclusion list', () => {
      const broadcaster = Broadcaster.to('chat').except('socket-1')
      expect(broadcaster['_except']).toContain('socket-1')
    })

    it('should add multiple socket IDs to exclusion list', () => {
      const broadcaster = Broadcaster.to('chat').except(['socket-1', 'socket-2'])
      expect(broadcaster['_except']).toContain('socket-1')
      expect(broadcaster['_except']).toContain('socket-2')
    })

    it('should chain multiple except calls', () => {
      const broadcaster = Broadcaster.to('chat')
        .except('socket-1')
        .except('socket-2')
      expect(broadcaster['_except'].length).toBe(2)
    })
  })

  describe('emit()', () => {
    it('should warn when no server configured', () => {
      setRippleServer(null)
      const warnSpy = vi.spyOn(console, 'warn')

      Broadcaster.to('chat').emit('test', {})

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No server configured')
      )
    })
  })

  describe('broadcast() function', () => {
    it('should broadcast event to channels', () => {
      const server = new RippleServer()
      const broadcastSpy = vi.spyOn(server, 'broadcast')
      setRippleServer(server)

      class TestEvent extends BroadcastEvent {
        broadcastOn() {
          return new PublicChannel('test')
        }
      }

      broadcast(new TestEvent())

      expect(broadcastSpy).toHaveBeenCalledWith(
        'test',
        'TestEvent',
        expect.any(Object)
      )
    })

    it('should broadcast to multiple channels', () => {
      const server = new RippleServer()
      const broadcastSpy = vi.spyOn(server, 'broadcast')
      setRippleServer(server)

      class MultiChannelEvent extends BroadcastEvent {
        broadcastOn() {
          return [
            new PublicChannel('channel-1'),
            new PublicChannel('channel-2'),
          ]
        }
      }

      broadcast(new MultiChannelEvent())

      expect(broadcastSpy).toHaveBeenCalledTimes(2)
    })
  })
})
```

### 2. 整合測試

```typescript
// tests/integration/websocket-flow.test.ts

describe('WebSocket Integration', () => {
  let server: RippleServer
  let bunServer: Server

  beforeAll(async () => {
    server = new RippleServer({
      path: '/ws',
      authorizer: async (channel, userId) => {
        if (channel.startsWith('presence-')) {
          return { id: userId ?? 'anonymous', info: { name: 'Test User' } }
        }
        return true
      },
    })

    await server.init()

    bunServer = Bun.serve({
      port: 0, // 隨機可用埠
      fetch: (req, srv) => {
        if (server.upgrade(req, srv)) return
        return new Response('Not found', { status: 404 })
      },
      websocket: server.getHandler(),
    })
  })

  afterAll(async () => {
    bunServer.stop()
    await server.shutdown()
  })

  it('should complete full connection lifecycle', async () => {
    const ws = new WebSocket(`ws://localhost:${bunServer.port}/ws`)
    const messages: any[] = []

    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'test' }))
      }

      ws.onmessage = (event) => {
        messages.push(JSON.parse(event.data))
        if (messages.length === 2) resolve()
      }
    })

    expect(messages[0].type).toBe('connected')
    expect(messages[1].type).toBe('subscribed')

    ws.close()
  })

  it('should handle presence channel join/leave', async () => {
    const ws1 = new WebSocket(`ws://localhost:${bunServer.port}/ws`)
    const ws2 = new WebSocket(`ws://localhost:${bunServer.port}/ws`)

    const messages1: any[] = []
    const messages2: any[] = []

    await Promise.all([
      new Promise<void>((resolve) => {
        ws1.onopen = () => {
          ws1.send(JSON.stringify({
            type: 'subscribe',
            channel: 'presence-lobby',
          }))
        }
        ws1.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          messages1.push(msg)
          if (msg.type === 'presence' && msg.event === 'members') resolve()
        }
      }),
      new Promise<void>((resolve) => {
        ws2.onopen = () => {
          ws2.send(JSON.stringify({
            type: 'subscribe',
            channel: 'presence-lobby',
          }))
        }
        ws2.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          messages2.push(msg)
          if (msg.type === 'presence' && msg.event === 'members') resolve()
        }
      }),
    ])

    // 驗證兩個客戶端都收到 presence 更新
    expect(messages1.some(m => m.type === 'presence')).toBe(true)
    expect(messages2.some(m => m.type === 'presence')).toBe(true)

    ws1.close()
    ws2.close()
  })

  it('should broadcast messages to subscribers', async () => {
    const ws1 = new WebSocket(`ws://localhost:${bunServer.port}/ws`)
    const ws2 = new WebSocket(`ws://localhost:${bunServer.port}/ws`)

    const receivedByWs2: any[] = []

    await Promise.all([
      new Promise<void>((resolve) => {
        ws1.onopen = () => {
          ws1.send(JSON.stringify({ type: 'subscribe', channel: 'broadcast-test' }))
        }
        ws1.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.type === 'subscribed') resolve()
        }
      }),
      new Promise<void>((resolve) => {
        ws2.onopen = () => {
          ws2.send(JSON.stringify({ type: 'subscribe', channel: 'broadcast-test' }))
        }
        ws2.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.type === 'subscribed') resolve()
          if (msg.type === 'event') receivedByWs2.push(msg)
        }
      }),
    ])

    // 從伺服器廣播
    server.broadcast('broadcast-test', 'test-event', { data: 'hello' })

    await new Promise(r => setTimeout(r, 100))

    expect(receivedByWs2.some(m => m.event === 'test-event')).toBe(true)

    ws1.close()
    ws2.close()
  })
})
```

### 3. Redis 驅動整合測試

```typescript
// tests/integration/redis-driver.test.ts

describe('RedisDriver Integration', () => {
  // 跳過如果沒有 Redis 可用
  const skipIfNoRedis = process.env.REDIS_URL ? describe : describe.skip

  skipIfNoRedis('with real Redis', () => {
    let driver: RedisDriver

    beforeAll(async () => {
      driver = new RedisDriver({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      })
      await driver.init()
    })

    afterAll(async () => {
      await driver.shutdown()
    })

    it('should publish and receive messages', async () => {
      const received: any[] = []

      await driver.subscribe('integration-test', (event, data) => {
        received.push({ event, data })
      })

      await driver.publish('integration-test', 'TestEvent', { foo: 'bar' })

      await new Promise(r => setTimeout(r, 100))

      expect(received.length).toBe(1)
      expect(received[0].event).toBe('TestEvent')
    })

    it('should handle multiple subscribers', async () => {
      const received1: any[] = []
      const received2: any[] = []

      await driver.subscribe('multi-sub-test', (event, data) => {
        received1.push({ event, data })
      })

      await driver.subscribe('multi-sub-test', (event, data) => {
        received2.push({ event, data })
      })

      await driver.publish('multi-sub-test', 'BroadcastEvent', { count: 1 })

      await new Promise(r => setTimeout(r, 100))

      expect(received1.length).toBe(1)
      expect(received2.length).toBe(1)
    })
  })
})
```

### 4. 壓力測試

```typescript
// tests/stress/load.test.ts

describe('Load Testing', () => {
  it('should handle 1000 concurrent connections', async () => {
    const server = new RippleServer()
    await server.init()

    const bunServer = Bun.serve({
      port: 0,
      fetch: (req, srv) => {
        if (server.upgrade(req, srv)) return
        return new Response('Not found', { status: 404 })
      },
      websocket: server.getHandler(),
    })

    const connections: WebSocket[] = []
    const connectedCount = { value: 0 }

    // 建立 1000 個連接
    const connectPromises = Array.from({ length: 1000 }, () =>
      new Promise<void>((resolve) => {
        const ws = new WebSocket(`ws://localhost:${bunServer.port}/ws`)
        ws.onopen = () => {
          connectedCount.value++
          resolve()
        }
        connections.push(ws)
      })
    )

    await Promise.all(connectPromises)

    expect(connectedCount.value).toBe(1000)

    const stats = server.getStats()
    expect(stats.totalClients).toBe(1000)

    // 清理
    connections.forEach(ws => ws.close())
    await new Promise(r => setTimeout(r, 100))

    bunServer.stop()
    await server.shutdown()
  }, 30000)

  it('should handle rapid subscribe/unsubscribe', async () => {
    const server = new RippleServer()
    await server.init()

    const bunServer = Bun.serve({
      port: 0,
      fetch: (req, srv) => {
        if (server.upgrade(req, srv)) return
        return new Response('Not found', { status: 404 })
      },
      websocket: server.getHandler(),
    })

    const ws = new WebSocket(`ws://localhost:${bunServer.port}/ws`)

    await new Promise<void>((resolve) => {
      ws.onopen = resolve
    })

    // 快速訂閱/取消訂閱 100 次
    for (let i = 0; i < 100; i++) {
      ws.send(JSON.stringify({ type: 'subscribe', channel: `rapid-${i}` }))
      ws.send(JSON.stringify({ type: 'unsubscribe', channel: `rapid-${i}` }))
    }

    await new Promise(r => setTimeout(r, 500))

    // 應該沒有崩潰，統計正常
    const stats = server.getStats()
    expect(stats.totalClients).toBe(1)

    ws.close()
    bunServer.stop()
    await server.shutdown()
  })

  it('should handle high message throughput', async () => {
    const server = new RippleServer()
    await server.init()

    const bunServer = Bun.serve({
      port: 0,
      fetch: (req, srv) => {
        if (server.upgrade(req, srv)) return
        return new Response('Not found', { status: 404 })
      },
      websocket: server.getHandler(),
    })

    const receivedCount = { value: 0 }
    const ws = new WebSocket(`ws://localhost:${bunServer.port}/ws`)

    await new Promise<void>((resolve) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'throughput' }))
      }
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'subscribed') resolve()
        if (msg.type === 'event') receivedCount.value++
      }
    })

    // 發送 10000 條訊息
    const start = performance.now()
    for (let i = 0; i < 10000; i++) {
      server.broadcast('throughput', 'msg', { i })
    }
    const duration = performance.now() - start

    await new Promise(r => setTimeout(r, 1000))

    console.log(`Broadcast 10000 messages in ${duration.toFixed(2)}ms`)
    console.log(`Received ${receivedCount.value} messages`)

    expect(receivedCount.value).toBe(10000)

    ws.close()
    bunServer.stop()
    await server.shutdown()
  }, 30000)
})
```

---

## 實施任務

### 任務 4.1：補充 RippleServer 單元測試

**目標覆蓋**：
- [ ] `init()` / `shutdown()` 流程
- [ ] `broadcastToClients()` 方法
- [ ] `handleDrain()` 回呼
- [ ] 各種授權場景
- [ ] 事件監聽器

---

### 任務 4.2：補充 Broadcaster 測試

**目標覆蓋**：
- [ ] 所有靜態方法
- [ ] `except()` 鏈式呼叫
- [ ] 無伺服器時的行為
- [ ] 多頻道廣播

---

### 任務 4.3：新增整合測試

**測試場景**：
- [ ] 完整連接生命週期
- [ ] Presence 頻道加入/離開
- [ ] 廣播訊息傳遞
- [ ] 授權失敗處理

---

### 任務 4.4：新增 Redis 整合測試

**測試場景**：
- [ ] 發布/訂閱基本流程
- [ ] 多訂閱者場景
- [ ] 連接恢復
- [ ] 錯誤處理

---

### 任務 4.5：新增壓力測試

**測試場景**：
- [ ] 1000+ 並發連接
- [ ] 快速訂閱/取消訂閱
- [ ] 高訊息吞吐量
- [ ] 記憶體洩漏檢測

---

## 測試輔助工具

```typescript
// tests/helpers/mock-websocket.ts

export function createMockWebSocket(
  onSend?: (data: string) => void
): RippleWebSocket {
  return {
    data: {
      id: crypto.randomUUID(),
      channels: new Set<string>(),
    },
    send: vi.fn((data: string) => {
      onSend?.(data)
    }),
    close: vi.fn(),
  } as unknown as RippleWebSocket
}

// tests/helpers/test-server.ts

export async function createTestServer(
  config?: RippleConfig
): Promise<{ server: RippleServer; bunServer: Server; port: number }> {
  const server = new RippleServer(config)
  await server.init()

  const bunServer = Bun.serve({
    port: 0,
    fetch: (req, srv) => {
      if (server.upgrade(req, srv)) return
      return new Response('Not found', { status: 404 })
    },
    websocket: server.getHandler(),
  })

  return {
    server,
    bunServer,
    port: bunServer.port,
  }
}
```

---

## 成功標準

- [ ] 行覆蓋率達 90%+
- [ ] 分支覆蓋率達 85%+
- [ ] 函式覆蓋率達 95%+
- [ ] 整合測試覆蓋所有主要流程
- [ ] 壓力測試通過 1000 並發連接
- [ ] 所有測試在 CI 中穩定執行

---

## 風險緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 測試不穩定 | 中 | 使用適當的等待和超時 |
| CI 資源不足 | 中 | 壓力測試單獨執行 |
| Redis 依賴 | 低 | 使用 mock 或跳過條件 |

---

**下一階段**：[第 5 階段：文件與開發者體驗](./PHASE-5-DOCUMENTATION.md)
