# 內存管理與垃圾回收

## 1. 背景 (Background)

### 1.1 為什麼內存管理重要？

在 Node.js/Bun 中，內存管理不當會導致：
- **內存洩漏**：無用對象未釋放，持續佔用內存
- **GC 停頓**：垃圾回收暫停應用，造成延遲尖峰
- **堆空間耗盡**：應用崩潰，無法恢復
- **性能下降**：過度 GC 導致 CPU 使用率高

### 1.2 Bun vs Node.js

```
Node.js（V8 引擎）：
- GC 策略：生成式 GC
- 堆大小限制：~2GB（64-bit）
- 監控工具：rich

Bun（JavaScriptCore）：
- GC 策略：引用計數 + Mark-Sweep
- 堆大小限制：更靈活
- 監控工具：內建性能 API
- 優勢：更少 GC 暫停
```

---

## 2. Bun 中的內存監控 (Memory Monitoring in Bun)

### 2.1 基礎內存查詢

```typescript
// 取得當前內存使用情況
const memoryUsage = process.memoryUsage()

console.log({
  rss: Math.round(memoryUsage.rss / 1024 / 1024),          // 常駐集大小（MB）
  heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),  // 堆總大小
  heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),    // 堆已用大小
  external: Math.round(memoryUsage.external / 1024 / 1024),    // 外部分配
  arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)  // 數組緩衝
})

// 輸出示例：
// {
//   rss: 120,           // 應用實際使用的內存
//   heapTotal: 80,      // V8 分配的堆大小
//   heapUsed: 45,       // 當前使用的堆
//   external: 2,        // C++ 對象分配
//   arrayBuffers: 5     // ArrayBuffer 分配
// }
```

### 2.2 內存監控週期

```typescript
// 定期監控內存使用
class MemoryMonitor {
  private samples: MemorySnapshot[] = []
  private readonly MAX_SAMPLES = 60

  start(intervalMs: number = 5000): void {
    setInterval(() => {
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        ...process.memoryUsage()
      }

      this.samples.push(snapshot)

      // 保留最近 60 個樣本（5 分鐘）
      if (this.samples.length > this.MAX_SAMPLES) {
        this.samples.shift()
      }

      this.checkThresholds(snapshot)
    }, intervalMs)
  }

  private checkThresholds(snapshot: MemorySnapshot): void {
    const heapUsedMB = snapshot.heapUsed / 1024 / 1024

    // 告警：堆使用率超過 80%
    if (snapshot.heapUsed > snapshot.heapTotal * 0.8) {
      console.warn(`⚠️ High heap usage: ${heapUsedMB.toFixed(2)}MB`)
    }

    // 危險：堆使用率超過 95%
    if (snapshot.heapUsed > snapshot.heapTotal * 0.95) {
      console.error(`❌ Critical heap usage: ${heapUsedMB.toFixed(2)}MB`)
      this.triggerGC()
    }
  }

  private triggerGC(): void {
    if (global.gc) {
      console.log('🗑️ Triggering manual GC')
      global.gc()
    }
  }

  getStats() {
    if (this.samples.length === 0) return null

    const heapUsages = this.samples.map(s => s.heapUsed)
    const avg = heapUsages.reduce((a, b) => a + b) / heapUsages.length
    const max = Math.max(...heapUsages)
    const min = Math.min(...heapUsages)

    return {
      avgHeapMB: (avg / 1024 / 1024).toFixed(2),
      maxHeapMB: (max / 1024 / 1024).toFixed(2),
      minHeapMB: (min / 1024 / 1024).toFixed(2),
      trend: this.calculateTrend()
    }
  }

  private calculateTrend(): 'stable' | 'rising' | 'declining' {
    if (this.samples.length < 2) return 'stable'

    const first = this.samples[0].heapUsed
    const last = this.samples[this.samples.length - 1].heapUsed

    if (last > first * 1.1) return 'rising'
    if (last < first * 0.9) return 'declining'
    return 'stable'
  }
}
```

---

## 3. 內存洩漏檢測 (Memory Leak Detection)

### 3.1 識別內存洩漏模式

```typescript
// ❌ 洩漏 1：全局引用累積
const cache: any = {}

app.get('/api/data/:id', (ctx) => {
  // 每個請求都新增一個全局引用
  cache[ctx.param('id')] = {
    data: fetch('/external-api'),
    timestamp: Date.now()
  }
  // cache 永遠增長 → 內存洩漏！
})

// ✅ 正確：使用 TTL 或限制大小
const cache = new Map<string, CacheEntry>()
const MAX_CACHE_SIZE = 10000

app.get('/api/data/:id', (ctx) => {
  if (cache.size >= MAX_CACHE_SIZE) {
    // 刪除最舊的條目
    const [oldestKey] = cache.entries().next().value
    cache.delete(oldestKey)
  }

  cache.set(ctx.param('id'), {
    data: fetch('/external-api'),
    timestamp: Date.now()
  })
})
```

### 3.2 事件監聽器洩漏

```typescript
// ❌ 洩漏 2：未移除事件監聽器
class DataProcessor {
  constructor(private eventBus: EventBus) {
    // 在構造器中註冊
    eventBus.on('data:received', this.onDataReceived.bind(this))
  }

  destroy() {
    // 但析構時沒有移除 → 洩漏！
  }
}

// ✅ 正確：在析構時清理
class DataProcessor {
  private listener: any

  constructor(private eventBus: EventBus) {
    this.listener = this.onDataReceived.bind(this)
    eventBus.on('data:received', this.listener)
  }

  destroy() {
    this.eventBus.removeListener('data:received', this.listener)
  }
}
```

### 3.3 計時器洩漏

```typescript
// ❌ 洩漏 3：未清理計時器
setInterval(() => {
  // 這會永遠運行，即使不再需要
  console.log('Tick')
}, 1000)

// ✅ 正確：保存並清理計時器
class Timer {
  private handle: NodeJS.Timeout | null = null

  start() {
    this.handle = setInterval(() => {
      console.log('Tick')
    }, 1000)
  }

  stop() {
    if (this.handle) {
      clearInterval(this.handle)
      this.handle = null
    }
  }
}
```

---

## 4. 垃圾回收優化 (GC Optimization)

### 4.1 觸發手動 GC

```typescript
// 在 Bun 中啟用手動 GC
// 啟動時：bun --expose-gc app.ts

// 在應用中使用
if (global.gc) {
  console.log('GC available')

  // 在業務邏輯間隙手動觸發
  app.get('/health', (ctx) => {
    // 每小時檢查一次
    if (Date.now() % (60 * 60 * 1000) < 1000) {
      global.gc()
    }
    return ctx.json({ status: 'ok' })
  })
} else {
  console.warn('GC not available. Run with --expose-gc')
}
```

### 4.2 設置堆大小限制

```bash
# 限制堆大小為 512MB
bun --max-old-space-size=512 app.ts

# 限制為 1GB
bun --max-old-space-size=1024 app.ts

# 注意：過小的限制會導致頻繁 GC
# 過大的限制會導致單次 GC 停頓長
```

### 4.3 監控 GC 事件

```typescript
// Bun 內建性能觀測 API
import { performance } from 'perf_hooks'

// 追蹤 GC 暫停
const gcMeasures: number[] = []

performance.addEventListener('measure', (entry) => {
  if (entry.name.includes('gc')) {
    gcMeasures.push(entry.duration)

    if (entry.duration > 100) {  // > 100ms 的 GC
      console.warn(`⚠️ Long GC pause: ${entry.duration.toFixed(2)}ms`)
    }
  }
})

// 定期輸出 GC 統計
setInterval(() => {
  if (gcMeasures.length === 0) return

  const avg = gcMeasures.reduce((a, b) => a + b) / gcMeasures.length
  const max = Math.max(...gcMeasures)

  console.log(`GC Stats: avg=${avg.toFixed(2)}ms, max=${max.toFixed(2)}ms`)
  gcMeasures.length = 0
}, 60000)  // 每分鐘輸出一次
```

---

## 5. 對象池模式 (Object Pool Pattern)

### 5.1 減少對象分配

```typescript
// ❌ 低效：每次都新建對象
async function processRequest(req: Request): Promise<void> {
  const buffer = Buffer.alloc(1024)  // 每次分配
  const data = await readData(req, buffer)
  // ... 處理
  // buffer 作用域結束，GC 需要清理
}

// 如果每秒 100 個請求，每秒分配 100 個 buffer
// GC 壓力很大

// ✅ 高效：使用對象池
class BufferPool {
  private available: Buffer[] = []
  private inUse = new Set<Buffer>()

  constructor(size: number = 10, bufferSize: number = 1024) {
    for (let i = 0; i < size; i++) {
      this.available.push(Buffer.alloc(bufferSize))
    }
  }

  acquire(): Buffer {
    const buffer = this.available.pop()
    if (!buffer) {
      const newBuffer = Buffer.alloc(1024)
      this.inUse.add(newBuffer)
      return newBuffer
    }

    this.inUse.add(buffer)
    return buffer
  }

  release(buffer: Buffer): void {
    buffer.fill(0)  // 清空內容
    this.inUse.delete(buffer)
    this.available.push(buffer)
  }
}

const pool = new BufferPool(20)

async function processRequest(req: Request): Promise<void> {
  const buffer = pool.acquire()
  try {
    const data = await readData(req, buffer)
    // ... 處理
  } finally {
    pool.release(buffer)
  }
}

// 結果：固定分配 20 個 buffer，重複使用，GC 壓力大幅降低
```

### 5.2 使用 WeakMap 防止洩漏

```typescript
// WeakMap：鍵會被 GC，有助於防止洩漏
class Service {
  // 使用 WeakMap 存儲元數據
  private metadata = new WeakMap<any, any>()

  setMetadata(obj: any, data: any): void {
    this.metadata.set(obj, data)
  }

  getMetadata(obj: any): any {
    return this.metadata.get(obj)
  }
}

// 當 obj 被 GC 時，其在 metadata 中的條目也會自動移除
// 不存在內存洩漏風險
```

---

## 6. 長生命週期應用內存管理 (Long-Running Applications)

### 6.1 定期重啟策略

```typescript
// 對於無法完全消除洩漏的場景，定期重啟
const RESTART_INTERVAL = 24 * 60 * 60 * 1000  // 24 小時

setTimeout(() => {
  console.log('Scheduled restart due to potential memory drift')

  // 1. 停止接受新請求
  server.close()

  // 2. 完成現有請求（60 秒超時）
  setTimeout(() => {
    process.exit(0)  // 退出，容器/進程管理器會重啟
  }, 60000)
}, RESTART_INTERVAL)
```

### 6.2 優雅關閉

```typescript
// 監聽應用信號
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, graceful shutdown...')

  // 1. 停止 HTTP 服務
  await new Promise(resolve => server.close(resolve))

  // 2. 清理數據庫連接
  await db.destroy()

  // 3. 完成隊列中的任務
  await queue.drain()

  // 4. 退出
  process.exit(0)
})
```

### 6.3 周期性清理

```typescript
// 定期清理可能洩漏的資源
setInterval(async () => {
  console.log('Performing periodic cleanup...')

  // 清理過期緩存
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > 1 * 60 * 60 * 1000) {  // 1 小時
      cache.delete(key)
    }
  }

  // 清理斷開的數據庫連接
  await db.cleanup()

  // 清理已完成的隊列任務
  await queue.clean(1000, 'completed')

  // 如果使用了手動 GC
  if (global.gc) {
    global.gc()
  }
}, 60 * 60 * 1000)  // 每小時一次
```

---

## 7. 與 Gravito 的內存考量 (Memory Considerations in Gravito)

### 7.1 Hooks 系統內存

```typescript
// Hooks 系統可能累積監聽器
core.hooks.addAction('order:created', handler1)
core.hooks.addAction('order:created', handler2)
// ... 動態添加數千個 handlers

// ✅ 最佳實踐：限制動態 handlers
class HooksManager {
  private handlers = new Map<string, Set<Function>>()
  private readonly MAX_HANDLERS_PER_EVENT = 100

  addAction(eventName: string, handler: Function) {
    const handlers = this.handlers.get(eventName) || new Set()

    if (handlers.size >= this.MAX_HANDLERS_PER_EVENT) {
      throw new Error(`Too many handlers for ${eventName}`)
    }

    handlers.add(handler)
    this.handlers.set(eventName, handlers)
  }
}
```

### 7.2 Repository 緩存內存

```typescript
// Repository 中的查詢結果緩存需要 TTL
class CachedRepository<T> {
  private cache = new Map<string, { data: T; expiry: number }>()

  get(id: string): T | null {
    const entry = this.cache.get(id)

    if (!entry) return null

    if (Date.now() > entry.expiry) {
      this.cache.delete(id)
      return null
    }

    return entry.data
  }

  set(id: string, data: T, ttlMs: number = 60000) {
    this.cache.set(id, {
      data,
      expiry: Date.now() + ttlMs
    })
  }

  // 定期清理過期條目
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }
}
```

---

## 8. 性能基準測試 (Performance Benchmarking)

### 8.1 內存消耗基準

```typescript
// 測量操作的內存消耗
function benchmark(name: string, fn: () => void, iterations: number = 1000) {
  const before = process.memoryUsage()

  for (let i = 0; i < iterations; i++) {
    fn()
  }

  // 手動觸發 GC 以獲得準確測量
  if (global.gc) global.gc()

  const after = process.memoryUsage()

  const heapDiff = (after.heapUsed - before.heapUsed) / iterations / 1024
  console.log(`${name}: ${heapDiff.toFixed(2)}KB per iteration`)
}

// 使用示例
benchmark('Creating user object', () => {
  const user = { id: '1', name: 'Test', email: 'test@example.com' }
}, 10000)

benchmark('Creating buffer', () => {
  const buffer = Buffer.alloc(1024)
}, 10000)
```

### 8.2 長期內存趨勢

```typescript
// 監測應用啟動後的內存趨勢
const memoryTrend: number[] = []

setInterval(() => {
  const heapUsedMB = process.memoryUsage().heapUsed / 1024 / 1024
  memoryTrend.push(heapUsedMB)

  // 保留 24 小時的數據（每 5 分鐘採樣）
  if (memoryTrend.length > 24 * 12) {
    memoryTrend.shift()
  }

  // 分析趨勢
  if (memoryTrend.length > 10) {
    const recent = memoryTrend.slice(-10)
    const older = memoryTrend.slice(-20, -10)

    const recentAvg = recent.reduce((a, b) => a + b) / recent.length
    const olderAvg = older.reduce((a, b) => a + b) / older.length

    if (recentAvg > olderAvg * 1.2) {
      console.warn('⚠️ Memory usage rising significantly')
    }
  }
}, 5 * 60 * 1000)  // 每 5 分鐘
```

---

## 9. 常見陷阱 (Common Pitfalls)

### 陷阱 1：閉包引用

```typescript
// ❌ 錯誤：閉包保持大對象引用
function createHandler(largeData: Buffer) {
  return (req: Request) => {
    // largeData 被閉包保持，即使不使用也無法 GC
    console.log('Request received')
  }
}

// ✅ 正確：顯式清理
function createHandler(largeData: Buffer) {
  return (req: Request) => {
    console.log('Request received')
  }
  // largeData 作用域結束，可被 GC
}
```

### 陷阱 2：數組持續增長

```typescript
// ❌ 錯誤：數組永遠增長
const logs: string[] = []

app.get('/api/endpoint', (ctx) => {
  logs.push(`Request: ${ctx.req.pathname}`)
  // logs 永遠增長 → 內存洩漏
})

// ✅ 正確：環形緩衝
class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private index = 0

  constructor(size: number) {
    this.buffer = new Array(size)
  }

  push(item: T) {
    this.buffer[this.index] = item
    this.index = (this.index + 1) % this.buffer.length
  }
}

const logs = new RingBuffer<string>(10000)  // 固定大小

app.get('/api/endpoint', (ctx) => {
  logs.push(`Request: ${ctx.req.pathname}`)
  // 永不超過 10000 條
})
```

---

## 10. 相關文檔與資源

- **[Bun 性能優化](https://bun.sh/docs/api/performance)** - 官方指南
- **[Node.js 內存管理](https://nodejs.org/en/docs/guides/simple-profiling/)** - V8 指南
- **[Chrome DevTools 堆檢查](https://developer.chrome.com/docs/devtools/memory-issues/)** - 調試工具
- **[垃圾回收科普](https://www.oracle.com/technical-resources/articles/java/index-jsp-140202.html)** - 基礎知識

---

**撰寫日期**：2026-02-08
**版本**：1.0
