# 🚀 Bun 原生路由優化 - 快速參考卡片

## 功能完整性速查表

```
Framework Support Level
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ FULLY IMPLEMENTED (6/15)
├─ 路由系統              (Static, Dynamic, Wildcard)
├─ 中間件系統            (Global, Scoped, Orbit)
├─ HTTP 方法             (GET, POST, PUT, DELETE...)
├─ 錯誤處理              (Error & NotFound handlers)
├─ 上下文管理            (Object pooling, State)
└─ 路由掛載              (Sub-adapters, Isolation)

⚠️  PARTIALLY IMPLEMENTED (1/15)
└─ WebSocket 支援        (Interface defined, not implemented)

❌ NOT IMPLEMENTED (8/15)
├─ TLS/HTTPS 支援        [P1] High Priority
├─ 客戶端 IP 提取        [P2] Medium Priority
├─ Per-Request 超時      [P2] Medium Priority
├─ 性能指標暴露          [P3] Low Priority
├─ Unix Domain Sockets   [P3] Low Priority
├─ 服務器生命週期        [P3] Low Priority
├─ HTML Imports          [Future] Low Priority
└─ 自動 HMR             [Future] Low Priority
```

---

## 優先級排序 (工作量 vs 影響)

### 🔴 Phase 1: Critical (Week 1-2)

| 功能 | 工作量 | 影響 | API 複雜性 |
|------|--------|------|----------|
| **WebSocket** | 40h | 高 | 中 |
| **TLS/HTTPS** | 20h | 高 | 低 |
| **Client IP** | 8h | 中 | 低 |

**完成後**:
- ✅ 生產級功能奇偶性
- ✅ 實時應用支援
- ✅ 安全部署就緒

### 🟡 Phase 2: Enterprise (Week 3-4)

| 功能 | 工作量 | 影響 | 難度 |
|------|--------|------|------|
| **Request Timeout** | 16h | 中 | 中 |
| **Metrics** | 24h | 低 | 低 |
| **Unix Sockets** | 12h | 低 | 中 |

### 🟢 Phase 3: Polish (Week 5-6)

| 功能 | 工作量 | 影響 | 難度 |
|------|--------|------|------|
| **Server Lifecycle** | 16h | 低 | 低 |
| **HTML Imports** | 20h | 低 | 高 |

---

## 實現代碼片段

### 1️⃣ WebSocket (最高優先級)

```typescript
// 註冊 WebSocket 路由
adapter.registerWebSocketRoute('/chat', {
  open: (ctx) => {
    console.log(`Client ${ctx.clientIP()} connected`)
  },
  message: (ctx, data) => {
    // Route message: parse path-based handlers
    broadcast(data)
  },
  close: (ctx, code, reason) => {
    console.log(`Closed: ${code} - ${reason}`)
  },
  drain: (ctx) => {
    // Handle backpressure
  }
})
```

### 2️⃣ TLS/HTTPS (安全必需)

```typescript
// 配置 HTTPS
const adapter = new BunNativeAdapter({
  port: 443,
  tls: {
    cert: Bun.file('cert.pem'),
    key: Bun.file('key.pem'),
    ca: Bun.file('ca-chain.pem')  // Optional
  }
})

adapter.start()
```

### 3️⃣ 客戶端 IP (審計日誌)

```typescript
// 在中間件中使用
adapter.use('*', async (ctx, next) => {
  const ip = ctx.clientIP()  // 自動處理代理
  ctx.set('request-id', `${ip}-${Date.now()}`)

  console.log(`[${ip}] ${ctx.req.method} ${ctx.req.path}`)
  await next()
})
```

### 4️⃣ 超時控制 (DoS 防護)

```typescript
// 配置超時
adapter.setTimeout({
  request: 30000,   // 30s per request
  idle: 60000,      // 60s idle timeout
  keepAlive: 5000   // 5s keep-alive
})
```

### 5️⃣ 性能指標 (監控)

```typescript
// 監控應用狀態
setInterval(() => {
  const metrics = adapter.getMetrics()
  console.log(`
    Pending Requests:  ${metrics.pendingRequests}
    Pending WebSockets: ${metrics.pendingWebSockets}
    Average Latency:   ${metrics.averageLatency.toFixed(2)}ms
    P99 Latency:       ${metrics.p99Latency.toFixed(2)}ms
  `)
}, 10000)
```

---

## 使用案例分析

### ✅ 已支援 (立即可用)

```typescript
// RESTful API
const api = new BunNativeAdapter()
api.route('GET', '/users/:id', getUser)
api.route('POST', '/users', createUser)
api.route('PUT', '/users/:id', updateUser)

// Middleware chain
api.use('*', logger)
api.use('/api/*', authenticate)
api.use('/admin/*', adminAuth)

// 部署
Bun.serve({
  fetch: api.fetch,
  port: 3000
})
```

### ⏳ 即將支援 (Phase 1)

```typescript
// WebSocket 聊天
adapter.registerWebSocketRoute('/ws/chat', {
  message: (ctx, msg) => sendToAll(msg)
})

// HTTPS 部署
const adapter = new BunNativeAdapter({
  tls: { cert, key }
})

// 安全日誌
api.use('*', (ctx, next) => {
  console.log(`[${ctx.clientIP()}] ${ctx.req.method} ${ctx.req.path}`)
  return next()
})
```

### 🔮 計劃支援 (Phase 2-3)

```typescript
// Unix socket 高性能
const adapter = new BunNativeAdapter({
  socketType: 'unix',
  unix: '/tmp/gravito.sock'
})

// 超時保護
adapter.setTimeout({ request: 30000 })

// 優雅關閉
const server = await adapter.start()
process.on('SIGTERM', () => server.stop())

// 性能監控
console.log(adapter.getMetrics())
```

---

## 測試清單 (Phase 1 完成標準)

### WebSocket 功能

- [ ] 連接時調用 `open` 回調
- [ ] 接收消息時路由到正確的處理器
- [ ] 路由參數在 WebSocket 上下文中可用
- [ ] 斷開連接時調用 `close` 回調
- [ ] 背壓管理工作 (drain)
- [ ] 併發連接穩定性 (100+)
- [ ] 消息廣播功能
- [ ] 錯誤處理和恢復

### TLS/HTTPS 功能

- [ ] HTTPS 連接建立成功
- [ ] 證書驗證工作
- [ ] 証書鏈支援
- [ ] HTTP → HTTPS 重定向
- [ ] 自簽名證書支援
- [ ] 密鑰密碼短語支援

### 客戶端 IP 功能

- [ ] 直接連接返回真實 IP
- [ ] X-Forwarded-For 正確解析
- [ ] 多級代理支援
- [ ] 無效值的回退

---

## 效能影響預測

### 運行時開銷

```
Current:  145,000 req/sec
After P1: 137,500 req/sec (95% efficiency, -5% with WebSocket)
After P2: 135,000 req/sec (93% efficiency, comprehensive)
```

### 內存影響

```
BunNativeAdapter baseline: ~2.5MB
+ WebSocket tracking:       +0.8MB
+ TLS certificates:         +0.3MB
+ Metrics collection:       +0.5MB
─────────────────────────
Projected total:           ~4.1MB (+64%)
```

### 構建時間

```
Current:  ~850ms
After P1: ~1.2s (+40%)
After P2: ~1.5s (+76%)
```

---

## 遷移指南

### 現有代碼兼容性

✅ **完全向後兼容**
- 所有新功能都是可選的
- 現有 API 保持不變
- 無 breaking changes

### 升級路徑

```typescript
// Today (✅ Works)
const adapter = new BunNativeAdapter()
api.route('GET', '/users', handler)

// Phase 1 (✅ Still works + new)
const adapter = new BunNativeAdapter({ tls: {...} })
adapter.registerWebSocketRoute('/ws', {...})

// Phase 2 (✅ Still works + more)
adapter.setTimeout({...})
console.log(adapter.getMetrics())

// Phase 3 (✅ Still works + complete)
const server = await adapter.start()
await server.stop()
```

---

## 關鍵決策點

### 1. WebSocket 架構

**決定**: 路徑型路由 vs 回調型？
- ✅ 推薦: **路徑型**（與 HTTP 一致）
- ❌ 不推薦: 回調型（不一致）

### 2. TLS 配置

**決定**: 構造函數 vs 方法？
- ✅ 推薦: **構造函數**（預啟動）
- 備選: `adapter.configure()` 方法

### 3. IP 提取

**決定**: 自動 vs 顯式？
- ✅ 推薦: **自動**（在 clientIP() 中）
- 優先順序: X-Forwarded-For → Socket → Default

---

## 連結和參考

📖 **文檔**:
- [完整分析報告](./bun-native-routing-optimization-analysis.md)
- [Bun HTTP API](https://bun.com/docs/runtime/http)
- [Bun WebSocket](https://bun.com/docs/runtime/http/websocket)

🔗 **相關代碼**:
- `/packages/core/src/adapters/bun/BunNativeAdapter.ts`
- `/packages/core/src/adapters/types.ts`
- `/packages/core/src/http/types.ts`

✅ **測試**:
- `/packages/core/tests/adapters-bun-native.test.ts`
- `/packages/core/tests/adapters-integration.test.ts`

---

**版本**: 1.0.0 (快速參考)
**最後更新**: 2026-02-23
**推薦操作**: 閱讀完整分析報告以了解實現細節
