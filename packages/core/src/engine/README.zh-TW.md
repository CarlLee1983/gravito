# Gravito Core Engine (繁體中文)

> **專為 Bun 打造的高效能 Web 引擎**

從 Gravito 框架中獨立提取、專為 Bun 運行時深度優化的 Web 引擎。適用於追求極限效能且不需完整框架負擔的開發者。

## 為什麼選擇 Gravito Engine？

通用型框架為了跨平台相容性，通常會犧牲 20% 以上的潛在效能。**Gravito Engine 選擇走極致路線**。我們僅支援 Bun，因此能解鎖其所有底層潛力。

### 效能優化特性 (Bun 1.39+)

1.  **原生路由卸載 (Native Offloading)**：自動將靜態路由與預編譯中介軟體卸載至 Bun 的 SIMD 加速 C++/Zig 路由器。
2.  **AOT 中介軟體注入**：將中介軟體鏈預編譯為單一函數，消除運行時的樹狀遍歷與微任務 (Microtask) 開銷。
3.  **物件池化 (Object Pooling)**：透過 `FastContext` 循環利用，實現處理過程中的「零 JS 堆分配」。
4.  **微任務消除**：利用 `Bun.peek()` 讓同步處理器直接執行，避開事件循環的非必要調度。
5.  **延遲串流釋放 (Deferred Stream Release)**：確保 Streaming 回應 (SSE/WebSocket) 的資源回收安全與 IoC 資源清理。

## 📊 可觀測性與監控

### 路由模式 (Route Pattern) 支援

為了防止 Prometheus 指標基數爆炸，引擎會自動偵測路由模式（如 `/users/:id`），並透過 `c.req.routePattern` 導出。

### 基準測試目標

- **靜態路由**: 完全跳過 JS 入口（達到原生內核速度）。
- **動態路由**: 比 Hono 快 25% 以上。
- **記憶體足跡**: 處理請求時幾乎無新增分配。

## 安裝

```bash
bun add @gravito/core
```

## 快速上手

```typescript
import { Gravito } from '@gravito/core/engine'

const app = new Gravito()

// 靜態路由 (自動原生卸載)
app.get('/', (c) => c.json({ message: 'Hello, World!' }))

// 動態路由 (AOT 預編譯)
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ userId: id })
})

// 使用優化的原生配置啟動伺服器
export default app.serveConfig({
  port: 3000
})
```

### 回應輔助方法 (Response Helpers)

```typescript
// JSON (使用原生 Response.json() 優化)
c.json({ message: 'Hello' }, 200)

// 二進位 (專為 CBOR/Protobuf 優化，支援 Bun.ArrayBufferSink)
c.binary(new Uint8Array([...]), 200)

// HTML (支援 SIMD 加速轉義 c.escape())
c.html('<h1>Hello</h1>', 200)

// 串流 (利用 Direct Stream 實現內核級零拷貝傳輸)
c.stream(readableStream, 200)
```

## 進階用法

### 優化 TLS 配置 (Bun 1.39+)

Gravito 會自動將憑證路徑轉換為 `Bun.file()` 以實現零拷貝載入，並在生產環境自動啟用低記憶體模式。

```typescript
export default app.serveConfig({
  port: 443,
  tls: {
    key: "./key.pem",
    cert: "./cert.pem"
  }
})
```

### 延遲池化與 IoC 清理

即使是 Streaming 回應，Gravito 也能保證 100% 資源清理。Context 僅會在串流完全結束或用戶斷開連線後才返回池中。

```typescript
app.get('/events', (c) => {
  const stream = new ReadableStream({ ... })
  // Scoped 服務資源將在串流結束後才執行清理
  return c.stream(stream)
})
```

## 授權

MIT
