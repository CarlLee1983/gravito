# 第 2 階段：錯誤處理與可觀測性

> 實現結構化日誌、連接生命週期追蹤、健康檢查端點

## 概覽

此階段專注於改善 ripple 模組的錯誤處理機制和可觀測性，使問題診斷和系統監控更加容易。

## 當前問題分析

### 1. 缺乏結構化日誌（高優先度）

**位置**：多處散落的 `console.error` 和 `console.warn`

```typescript
// Broadcaster.ts:44
console.warn('[Ripple] No server configured. Event not broadcast.')

// RedisDriver.ts:65-66
this.subscriber.on('error', (error: Error) => {
  console.error('[RedisDriver] Subscriber error:', error)
})

// RedisDriver.ts:155
console.error('[RedisDriver] Failed to handle message:', error)
```

**問題**：
- 無法聚合日誌至集中式日誌系統
- 缺乏上下文資訊（client ID、channel 名稱等）
- 無法設定日誌等級
- 生產環境難以追蹤問題

### 2. `send()` 方法無聲失敗（中優先度）

**位置**：`src/RippleServer.ts:379-385`

```typescript
private send(ws: RippleWebSocket, message: ServerMessage): void {
  try {
    ws.send(JSON.stringify(message))
  } catch {
    // Connection might be closed - 完全無日誌！
  }
}
```

**問題**：
- 連接問題難以診斷
- 無法追蹤訊息送達率
- 無法識別有問題的客戶端

### 3. 缺乏連接生命週期追蹤

**現況**：
- 無法知道客戶端何時連接
- 無法追蹤連接持續時間
- 無法識別異常斷線模式

### 4. 缺乏健康檢查機制

**現況**：
- 無法從外部檢查伺服器狀態
- 無法監控 Redis 連接健康
- 負載平衡器無法判斷伺服器可用性

---

## 目標架構

### 1. 結構化日誌系統

**新檔案結構**：
```
src/
├── logging/
│   ├── Logger.ts           # 日誌介面與預設實現
│   ├── LogContext.ts       # 日誌上下文
│   └── index.ts
```

**Logger 介面設計**：
```typescript
// src/logging/Logger.ts

/**
 * 日誌等級
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * 日誌上下文
 */
export interface LogContext {
  /** 時間戳 */
  timestamp: string
  /** 日誌等級 */
  level: LogLevel
  /** 模組名稱 */
  module: string
  /** 客戶端 ID */
  clientId?: string
  /** 頻道名稱 */
  channel?: string
  /** 事件名稱 */
  event?: string
  /** 錯誤代碼 */
  errorCode?: string
  /** 額外資料 */
  [key: string]: unknown
}

/**
 * 日誌器介面
 */
export interface RippleLogger {
  debug(message: string, context?: Partial<LogContext>): void
  info(message: string, context?: Partial<LogContext>): void
  warn(message: string, context?: Partial<LogContext>): void
  error(message: string, context?: Partial<LogContext>): void
}

/**
 * 預設控制台日誌器
 */
export class ConsoleLogger implements RippleLogger {
  constructor(
    private readonly module: string,
    private readonly minLevel: LogLevel = 'info'
  ) {}

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  private formatContext(level: LogLevel, context?: Partial<LogContext>): LogContext {
    return {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      ...context,
    }
  }

  debug(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('debug')) {
      console.debug(JSON.stringify({
        message,
        ...this.formatContext('debug', context),
      }))
    }
  }

  info(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('info')) {
      console.info(JSON.stringify({
        message,
        ...this.formatContext('info', context),
      }))
    }
  }

  warn(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('warn')) {
      console.warn(JSON.stringify({
        message,
        ...this.formatContext('warn', context),
      }))
    }
  }

  error(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('error')) {
      console.error(JSON.stringify({
        message,
        ...this.formatContext('error', context),
      }))
    }
  }
}

/**
 * 建立模組專屬日誌器
 */
export function createLogger(module: string, minLevel?: LogLevel): RippleLogger {
  return new ConsoleLogger(module, minLevel)
}
```

### 2. 改善 RippleServer 錯誤處理

**更新後的 `send()` 方法**：
```typescript
// src/RippleServer.ts

private logger: RippleLogger

constructor(config: RippleConfig = {}) {
  // ... 現有程式碼 ...
  this.logger = config.logger ?? createLogger('RippleServer')
}

private send(ws: RippleWebSocket, message: ServerMessage): boolean {
  try {
    ws.send(JSON.stringify(message))
    return true
  } catch (error) {
    this.logger.warn('Failed to send message', {
      clientId: ws.data.id,
      messageType: message.type,
      errorCode: 'SEND_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}
```

### 3. 連接生命週期追蹤

**連接事件定義**：
```typescript
// src/types.ts

/**
 * 連接事件類型
 */
export type ConnectionEvent =
  | { type: 'connected'; clientId: string; timestamp: Date }
  | { type: 'disconnected'; clientId: string; timestamp: Date; code: number; reason: string; duration: number }
  | { type: 'subscribed'; clientId: string; channel: string; timestamp: Date }
  | { type: 'unsubscribed'; clientId: string; channel: string; timestamp: Date }
  | { type: 'error'; clientId: string; error: string; timestamp: Date }

/**
 * 連接追蹤器介面
 */
export interface ConnectionTracker {
  onConnect(clientId: string): void
  onDisconnect(clientId: string, code: number, reason: string): void
  onSubscribe(clientId: string, channel: string): void
  onUnsubscribe(clientId: string, channel: string): void
  onError(clientId: string, error: string): void
  getConnectionDuration(clientId: string): number | null
  getActiveConnections(): number
}
```

**ConnectionTracker 實現**：
```typescript
// src/tracking/ConnectionTracker.ts

export class DefaultConnectionTracker implements ConnectionTracker {
  private connections = new Map<string, {
    connectedAt: Date
    subscriptions: Set<string>
  }>()

  private logger: RippleLogger

  constructor(logger?: RippleLogger) {
    this.logger = logger ?? createLogger('ConnectionTracker')
  }

  onConnect(clientId: string): void {
    this.connections.set(clientId, {
      connectedAt: new Date(),
      subscriptions: new Set(),
    })

    this.logger.info('Client connected', {
      clientId,
      activeConnections: this.getActiveConnections(),
    })
  }

  onDisconnect(clientId: string, code: number, reason: string): void {
    const connection = this.connections.get(clientId)
    const duration = connection
      ? Date.now() - connection.connectedAt.getTime()
      : 0

    this.logger.info('Client disconnected', {
      clientId,
      code: code.toString(),
      reason,
      durationMs: duration,
      subscriptions: connection?.subscriptions.size ?? 0,
    })

    this.connections.delete(clientId)
  }

  onSubscribe(clientId: string, channel: string): void {
    const connection = this.connections.get(clientId)
    connection?.subscriptions.add(channel)

    this.logger.debug('Client subscribed', {
      clientId,
      channel,
    })
  }

  onUnsubscribe(clientId: string, channel: string): void {
    const connection = this.connections.get(clientId)
    connection?.subscriptions.delete(channel)

    this.logger.debug('Client unsubscribed', {
      clientId,
      channel,
    })
  }

  onError(clientId: string, error: string): void {
    this.logger.error('Client error', {
      clientId,
      error,
    })
  }

  getConnectionDuration(clientId: string): number | null {
    const connection = this.connections.get(clientId)
    if (!connection) return null
    return Date.now() - connection.connectedAt.getTime()
  }

  getActiveConnections(): number {
    return this.connections.size
  }
}
```

### 4. 健康檢查端點

**健康狀態定義**：
```typescript
// src/types.ts

/**
 * 健康狀態
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

/**
 * 健康檢查結果
 */
export interface HealthCheckResult {
  status: HealthStatus
  timestamp: string
  uptime: number
  checks: {
    websocket: ComponentHealth
    driver: ComponentHealth
  }
  stats: {
    activeConnections: number
    totalChannels: number
    messagesPerSecond: number
  }
}

/**
 * 元件健康狀態
 */
export interface ComponentHealth {
  status: HealthStatus
  message?: string
  lastCheck: string
}
```

**HealthChecker 實現**：
```typescript
// src/health/HealthChecker.ts

export class HealthChecker {
  private startTime = Date.now()
  private messageCount = 0
  private lastMessageCountReset = Date.now()

  constructor(
    private readonly server: RippleServer,
    private readonly driver: RippleDriver
  ) {}

  /**
   * 記錄訊息（用於計算每秒訊息數）
   */
  recordMessage(): void {
    this.messageCount++
  }

  /**
   * 執行健康檢查
   */
  async check(): Promise<HealthCheckResult> {
    const now = new Date()
    const driverHealth = await this.checkDriver()
    const websocketHealth = this.checkWebSocket()

    const overallStatus = this.determineOverallStatus([
      driverHealth.status,
      websocketHealth.status,
    ])

    // 計算每秒訊息數
    const elapsed = (Date.now() - this.lastMessageCountReset) / 1000
    const messagesPerSecond = elapsed > 0 ? this.messageCount / elapsed : 0

    // 重置計數器
    this.messageCount = 0
    this.lastMessageCountReset = Date.now()

    const stats = this.server.getStats()

    return {
      status: overallStatus,
      timestamp: now.toISOString(),
      uptime: Date.now() - this.startTime,
      checks: {
        websocket: websocketHealth,
        driver: driverHealth,
      },
      stats: {
        activeConnections: stats.clients,
        totalChannels: stats.channels,
        messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      },
    }
  }

  private checkWebSocket(): ComponentHealth {
    try {
      const stats = this.server.getStats()
      return {
        status: 'healthy',
        message: `${stats.clients} active connections`,
        lastCheck: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      }
    }
  }

  private async checkDriver(): Promise<ComponentHealth> {
    try {
      // 對於 Redis 驅動，嘗試 ping
      if ('isInitialized' in this.driver && !this.driver.isInitialized) {
        return {
          status: 'unhealthy',
          message: 'Driver not initialized',
          lastCheck: new Date().toISOString(),
        }
      }

      return {
        status: 'healthy',
        message: `${this.driver.name} driver operational`,
        lastCheck: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      }
    }
  }

  private determineOverallStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.includes('unhealthy')) return 'unhealthy'
    if (statuses.includes('degraded')) return 'degraded'
    return 'healthy'
  }
}
```

### 5. 更新 RippleConfig

```typescript
// src/types.ts

export interface RippleConfig {
  // ... 現有設定 ...

  /** 自訂日誌器 */
  logger?: RippleLogger

  /** 連接追蹤器 */
  connectionTracker?: ConnectionTracker

  /** 是否啟用健康檢查端點 */
  healthCheck?: {
    enabled: boolean
    path?: string // 預設: '/health'
  }

  /** 日誌等級 */
  logLevel?: LogLevel
}
```

---

## 實施任務

### 任務 2.1：建立日誌模組

**檔案**：
- `src/logging/Logger.ts`
- `src/logging/index.ts`

**驗收標準**：
- [ ] RippleLogger 介面定義完整
- [ ] ConsoleLogger 實現結構化 JSON 輸出
- [ ] 支援日誌等級過濾
- [ ] 可注入自訂日誌器

---

### 任務 2.2：整合日誌至 RippleServer

**步驟**：
1. 在建構式中初始化日誌器
2. 替換所有 `console.log/warn/error` 為日誌器呼叫
3. 在 `send()` 方法新增失敗日誌
4. 在 `handleMessage()` 新增錯誤日誌

**驗收標準**：
- [ ] 所有 console 呼叫替換為日誌器
- [ ] 錯誤訊息包含完整上下文
- [ ] 日誌可被外部系統消費

---

### 任務 2.3：建立連接追蹤器

**檔案**：
- `src/tracking/ConnectionTracker.ts`
- `src/tracking/index.ts`

**驗收標準**：
- [ ] 追蹤連接開始/結束時間
- [ ] 追蹤訂閱狀態
- [ ] 提供連接統計 API
- [ ] 自動清理已斷線連接

---

### 任務 2.4：實現健康檢查

**檔案**：
- `src/health/HealthChecker.ts`
- `src/health/index.ts`

**整合方式**：
```typescript
// 在 RippleServer 中新增健康檢查端點支援
upgrade(req: Request, server: Server<ClientData>): boolean | Response {
  const url = new URL(req.url)

  // 健康檢查端點
  if (this.config.healthCheck?.enabled && url.pathname === (this.config.healthCheck.path ?? '/health')) {
    const result = await this.healthChecker.check()
    return new Response(JSON.stringify(result), {
      status: result.status === 'healthy' ? 200 : result.status === 'degraded' ? 503 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ... 現有 WebSocket 升級邏輯 ...
}
```

**驗收標準**：
- [ ] /health 端點返回 JSON 健康狀態
- [ ] 狀態碼正確反映健康程度
- [ ] 包含連接數、頻道數統計
- [ ] 包含驅動程式健康狀態

---

### 任務 2.5：整合至 RedisDriver

**步驟**：
1. 在 RedisDriver 中注入日誌器
2. 新增連接重試日誌
3. 追蹤 pub/sub 訊息統計
4. 實現連接健康檢查（ping/pong）

**驗收標準**：
- [ ] Redis 連接錯誤有完整日誌
- [ ] 重連嘗試有日誌記錄
- [ ] 可查詢 Redis 連接健康狀態

---

## 測試策略

### 單元測試

```typescript
// Logger.test.ts
describe('ConsoleLogger', () => {
  it('should output structured JSON', () => {
    const spy = vi.spyOn(console, 'info')
    const logger = new ConsoleLogger('TestModule')

    logger.info('Test message', { clientId: '123' })

    expect(spy).toHaveBeenCalled()
    const output = JSON.parse(spy.mock.calls[0][0])
    expect(output.message).toBe('Test message')
    expect(output.module).toBe('TestModule')
    expect(output.clientId).toBe('123')
  })

  it('should respect log level', () => {
    const spy = vi.spyOn(console, 'debug')
    const logger = new ConsoleLogger('TestModule', 'info')

    logger.debug('Debug message')

    expect(spy).not.toHaveBeenCalled()
  })
})

// ConnectionTracker.test.ts
describe('ConnectionTracker', () => {
  it('should track connection duration', async () => {
    const tracker = new DefaultConnectionTracker()

    tracker.onConnect('client-1')
    await new Promise(r => setTimeout(r, 100))
    const duration = tracker.getConnectionDuration('client-1')

    expect(duration).toBeGreaterThanOrEqual(100)
  })
})

// HealthChecker.test.ts
describe('HealthChecker', () => {
  it('should return healthy status when all checks pass', async () => {
    const mockServer = createMockRippleServer()
    const mockDriver = createMockDriver()
    const checker = new HealthChecker(mockServer, mockDriver)

    const result = await checker.check()

    expect(result.status).toBe('healthy')
    expect(result.checks.websocket.status).toBe('healthy')
    expect(result.checks.driver.status).toBe('healthy')
  })
})
```

---

## 成功標準

- [ ] 所有 console 呼叫替換為結構化日誌
- [ ] 健康檢查端點可用且返回正確狀態
- [ ] 連接生命週期完整追蹤
- [ ] 日誌包含足夠上下文供問題診斷
- [ ] 可注入自訂日誌器和追蹤器
- [ ] 新增測試覆蓋率達 90%+

---

## 風險緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 日誌效能影響 | 中 | 支援日誌等級，生產環境使用 info+ |
| 記憶體洩漏（追蹤器） | 中 | 確保斷線時正確清理 |
| 健康檢查阻塞 | 低 | 使用非阻塞檢查，設定超時 |

---

**下一階段**：[第 3 階段：效能優化](./PHASE-3-PERFORMANCE.md)
