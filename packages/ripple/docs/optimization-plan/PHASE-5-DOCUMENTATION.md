# 第 5 階段：文件與開發者體驗

> 完善 API 文件、新增架構圖、撰寫故障排除指南

## 概覽

此階段專注於提升 ripple 模組的文件品質和開發者體驗，包括完善 JSDoc、新增架構決策記錄 (ADR)、撰寫故障排除指南等。

## 當前文件狀況

### 現有文件

| 檔案 | 狀態 | 改善方向 |
|------|------|----------|
| `README.md` | ✅ 良好 | 新增進階使用範例 |
| `README.zh-TW.md` | ✅ 良好 | 同步更新 |
| 原始碼 JSDoc | ⚠️ 部分 | 補充參數說明和範例 |
| 架構文件 | ❌ 缺少 | 新增架構圖和 ADR |
| 故障排除 | ❌ 缺少 | 新增常見問題解答 |
| 安全指南 | ❌ 缺少 | 新增安全最佳實踐 |

### JSDoc 覆蓋分析

| 元件 | 公開方法 | 已文件化 | 缺少範例 |
|------|----------|----------|----------|
| RippleServer | 10 | 8 | 5 |
| ChannelManager | 12 | 6 | 8 |
| RedisDriver | 6 | 4 | 4 |
| Broadcaster | 5 | 3 | 3 |
| BroadcastEvent | 4 | 4 | 1 |

---

## 文件改善計劃

### 1. JSDoc 完善

#### RippleServer 範例

```typescript
/**
 * Ripple WebSocket 伺服器
 *
 * 提供基於頻道的即時通訊功能，使用 Bun 原生 WebSocket API。
 *
 * @example
 * 基本使用
 * ```typescript
 * import { RippleServer } from '@gravito/ripple'
 *
 * const ripple = new RippleServer({
 *   path: '/ws',
 *   pingInterval: 30000,
 * })
 *
 * await ripple.init()
 *
 * Bun.serve({
 *   fetch: (req, server) => {
 *     if (ripple.upgrade(req, server)) return
 *     return new Response('Not found', { status: 404 })
 *   },
 *   websocket: ripple.getHandler(),
 * })
 * ```
 *
 * @example
 * 搭配授權使用
 * ```typescript
 * const ripple = new RippleServer({
 *   authorizer: async (channel, userId, socketId) => {
 *     // 驗證使用者是否有權限訂閱此頻道
 *     if (channel.startsWith('presence-')) {
 *       const user = await getUser(userId)
 *       if (!user) return false
 *       return { id: user.id, info: { name: user.name, avatar: user.avatar } }
 *     }
 *     return userId !== undefined
 *   },
 * })
 * ```
 *
 * @example
 * 與 Gravito 框架整合
 * ```typescript
 * // 使用 OrbitRipple 自動整合
 * import { OrbitRipple } from '@gravito/ripple'
 *
 * app.use(new OrbitRipple({
 *   path: '/ws',
 *   driver: 'redis',
 *   redis: { host: 'localhost', port: 6379 },
 * }))
 * ```
 */
export class RippleServer {
  /**
   * 嘗試將 HTTP 請求升級為 WebSocket 連接
   *
   * @param req - HTTP 請求物件
   * @param server - Bun 伺服器實例
   * @returns 如果成功升級返回 true，否則返回 false
   *
   * @example
   * ```typescript
   * Bun.serve({
   *   fetch: (req, server) => {
   *     // 檢查是否為 WebSocket 升級請求
   *     if (ripple.upgrade(req, server)) {
   *       return // 升級成功，不需返回 Response
   *     }
   *     return new Response('Hello World')
   *   },
   * })
   * ```
   */
  upgrade(req: Request, server: Server<ClientData>): boolean

  /**
   * 廣播事件至指定頻道
   *
   * @param channel - 頻道名稱
   * @param event - 事件名稱
   * @param data - 事件資料
   *
   * @example
   * ```typescript
   * // 廣播訊息至所有訂閱者
   * ripple.broadcast('chat-room', 'new-message', {
   *   id: 1,
   *   text: 'Hello everyone!',
   *   sender: 'Alice',
   * })
   *
   * // 廣播至私有頻道
   * ripple.broadcast('private-orders.123', 'order-updated', {
   *   orderId: 123,
   *   status: 'shipped',
   * })
   * ```
   */
  broadcast(channel: string, event: string, data: unknown): void
}
```

#### Broadcaster 範例

```typescript
/**
 * 廣播器 - 提供流式 API 發送事件
 *
 * @example
 * 基本廣播
 * ```typescript
 * import { Broadcaster } from '@gravito/ripple'
 *
 * // 廣播至公開頻道
 * Broadcaster.to('announcements')
 *   .emit('system-notice', { message: '系統將於 5 分鐘後維護' })
 *
 * // 廣播至私有頻道
 * Broadcaster.toPrivate('orders.123')
 *   .emit('status-changed', { status: 'shipped' })
 *
 * // 廣播至 presence 頻道
 * Broadcaster.toPresence('chat.lobby')
 *   .emit('user-typing', { userId: 1 })
 * ```
 *
 * @example
 * 排除特定連接
 * ```typescript
 * // 排除發送者（用於 echo 避免）
 * Broadcaster.to('chat-room')
 *   .except(senderSocketId)
 *   .emit('new-message', { text: 'Hello' })
 *
 * // 排除多個連接
 * Broadcaster.to('chat-room')
 *   .except([socketId1, socketId2])
 *   .emit('admin-notice', { message: 'Important!' })
 * ```
 */
export class Broadcaster {
  // ...
}
```

### 2. 架構決策記錄 (ADR)

#### ADR-001: 使用 Bun 原生 WebSocket

```markdown
# ADR-001: 使用 Bun 原生 WebSocket API

## 狀態
已採用

## 背景
選擇 WebSocket 實現方案時，有以下選項：
1. ws - Node.js 生態系最流行的 WebSocket 函式庫
2. uWebSockets.js - 高效能 C++ WebSocket 實現
3. Bun 原生 WebSocket - Bun 內建的 WebSocket API

## 決策
採用 Bun 原生 WebSocket API

## 理由
1. **零依賴**: 不需要額外安裝套件
2. **效能**: Bun 原生實現經過高度優化
3. **簡單性**: API 設計與 Bun.serve 無縫整合
4. **一致性**: 與 Gravito 框架的 Bun-first 策略一致

## 影響
- 只能在 Bun 執行環境運行
- 無法使用 Node.js 作為執行環境
- 減少了套件大小和啟動時間

## 替代方案
如果需要 Node.js 相容性，可考慮建立 adapter 層支援多種實現。
```

#### ADR-002: 頻道授權設計

```markdown
# ADR-002: 頻道授權設計

## 狀態
已採用

## 背景
需要設計一個靈活的授權機制，支援：
- 公開頻道（無需授權）
- 私有頻道（需要身份驗證）
- Presence 頻道（需要身份驗證 + 使用者資訊）

## 決策
採用單一 authorizer 回呼函式，根據返回值區分授權結果：
- `true`: 授權成功
- `false`: 授權失敗
- `{ id, info }`: Presence 頻道授權成功，包含使用者資訊

## 理由
1. **簡單性**: 單一函式處理所有授權邏輯
2. **靈活性**: 使用者可自由實現任何授權邏輯
3. **相容性**: 與 Laravel Echo 的授權模式相似

## 影響
- 開發者需要在 authorizer 中處理頻道類型判斷
- Presence 頻道必須返回使用者資訊物件

## 替代方案
可考慮分離 `privateAuthorizer` 和 `presenceAuthorizer`，但這會增加設定複雜度。
```

### 3. 故障排除指南

```markdown
# 故障排除指南

## 常見問題

### 連接問題

#### Q: WebSocket 連接立即關閉
**症狀**: 客戶端連接後立即斷開，收不到任何訊息

**可能原因**:
1. 伺服器未呼叫 `ripple.init()`
2. WebSocket 路徑不匹配
3. CORS 問題（跨域請求）

**解決方案**:
```typescript
// 確保呼叫 init()
const ripple = new RippleServer({ path: '/ws' })
await ripple.init()  // 重要！

// 檢查路徑匹配
Bun.serve({
  fetch: (req, server) => {
    console.log('Request path:', new URL(req.url).pathname)
    if (ripple.upgrade(req, server)) return
    // ...
  },
})
```

#### Q: 無法連接到 Redis
**症狀**: 使用 Redis 驅動時啟動失敗

**可能原因**:
1. Redis 伺服器未運行
2. 連接資訊錯誤
3. 未安裝 ioredis

**解決方案**:
```bash
# 確認 Redis 運行中
redis-cli ping  # 應返回 PONG

# 安裝 ioredis
bun add ioredis

# 檢查連接設定
const ripple = new RippleServer({
  driver: 'redis',
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDIS_PASSWORD,  // 如果有密碼
  },
})
```

### 授權問題

#### Q: 私有頻道一直返回 Unauthorized
**症狀**: 訂閱私有頻道時總是收到授權錯誤

**可能原因**:
1. 未設定 authorizer
2. authorizer 邏輯錯誤
3. userId 未正確傳遞

**解決方案**:
```typescript
const ripple = new RippleServer({
  authorizer: async (channel, userId, socketId) => {
    // 記錄授權請求以便除錯
    console.log('Auth request:', { channel, userId, socketId })

    // 確保有返回值
    if (channel.startsWith('private-')) {
      return userId !== undefined  // 必須返回 boolean
    }
    return true
  },
})
```

### 效能問題

#### Q: 大量連接時記憶體持續增長
**症狀**: 運行一段時間後記憶體使用量不斷增加

**可能原因**:
1. 連接未正確清理
2. 事件監聽器累積
3. 大型訊息未釋放

**解決方案**:
```typescript
// 監控連接統計
setInterval(() => {
  const stats = ripple.getStats()
  console.log('Active connections:', stats.totalClients)
  console.log('Total channels:', stats.totalChannels)
}, 60000)

// 確保正確處理連接關閉
// (RippleServer 內部已處理，但檢查自訂邏輯)
```

## 除錯技巧

### 啟用詳細日誌

```typescript
// 未來版本支援
const ripple = new RippleServer({
  logLevel: 'debug',  // 'debug' | 'info' | 'warn' | 'error'
})
```

### 監控伺服器狀態

```typescript
// 定期輸出統計
setInterval(() => {
  const stats = ripple.getStats()
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    clients: stats.totalClients,
    channels: stats.totalChannels,
  }))
}, 10000)
```

### 健康檢查端點（規劃中）

```typescript
// Phase 2 實現後可用
Bun.serve({
  fetch: async (req, server) => {
    const url = new URL(req.url)

    if (url.pathname === '/health') {
      const health = await ripple.getHealth()
      return new Response(JSON.stringify(health), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (ripple.upgrade(req, server)) return
    return new Response('Not found', { status: 404 })
  },
})
```
```

### 4. 安全最佳實踐

```markdown
# 安全最佳實踐

## 授權設計

### 永遠驗證頻道授權

```typescript
// ✅ 正確：驗證使用者是否有權限
authorizer: async (channel, userId, socketId) => {
  if (channel.startsWith('private-orders.')) {
    const orderId = channel.replace('private-orders.', '')
    const order = await db.orders.findOne({ id: orderId, userId })
    return order !== null
  }
  return false
}

// ❌ 錯誤：直接允許所有私有頻道
authorizer: async () => true
```

### 限制 Presence 資訊

```typescript
// ✅ 正確：只返回必要的使用者資訊
authorizer: async (channel, userId) => {
  if (channel.startsWith('presence-')) {
    const user = await getUser(userId)
    return {
      id: user.id,
      info: {
        name: user.displayName,
        avatar: user.avatarUrl,
        // 不要包含敏感資訊
      },
    }
  }
  return true
}

// ❌ 錯誤：返回完整使用者物件
authorizer: async (channel, userId) => {
  const user = await getUser(userId)
  return { id: user.id, info: user }  // 可能包含 email, password hash 等
}
```

## 輸入驗證

### 驗證廣播資料

```typescript
import { z } from 'zod'

const messageSchema = z.object({
  text: z.string().max(1000),
  attachments: z.array(z.string().url()).max(5).optional(),
})

// 在廣播前驗證
function broadcastMessage(channel: string, data: unknown) {
  const validated = messageSchema.parse(data)
  ripple.broadcast(channel, 'message', validated)
}
```

## 速率限制

### 限制訂閱頻率

```typescript
const subscriptionRateLimit = new Map<string, number[]>()

authorizer: async (channel, userId, socketId) => {
  // 檢查訂閱速率
  const now = Date.now()
  const history = subscriptionRateLimit.get(socketId) ?? []
  const recentAttempts = history.filter(t => now - t < 60000)

  if (recentAttempts.length >= 10) {
    console.warn(`Rate limit exceeded for ${socketId}`)
    return false
  }

  recentAttempts.push(now)
  subscriptionRateLimit.set(socketId, recentAttempts)

  // 繼續正常授權邏輯
  return true
}
```

## Redis 安全

### 使用密碼保護

```typescript
const ripple = new RippleServer({
  driver: 'redis',
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDIS_PASSWORD,  // 必須設定
  },
})
```

### 使用 TLS 連接

```typescript
const ripple = new RippleServer({
  driver: 'redis',
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    tls: {
      rejectUnauthorized: true,
    },
  },
})
```
```

---

## 實施任務

### 任務 5.1：完善 JSDoc 文件

**範圍**：
- [ ] RippleServer 所有公開方法
- [ ] ChannelManager 公開 API
- [ ] Broadcaster 類別和函式
- [ ] 所有型別定義

**驗收標準**：
- [ ] 每個公開方法有說明和範例
- [ ] 參數和返回值有完整描述
- [ ] 複雜邏輯有使用範例

---

### 任務 5.2：建立架構文件

**新增檔案**：
- [ ] `docs/architecture/overview.md`
- [ ] `docs/architecture/ADR-001-bun-websocket.md`
- [ ] `docs/architecture/ADR-002-channel-authorization.md`
- [ ] `docs/architecture/ADR-003-driver-abstraction.md`

**驗收標準**：
- [ ] 架構圖清晰描述元件關係
- [ ] ADR 格式一致
- [ ] 決策理由充分說明

---

### 任務 5.3：撰寫故障排除指南

**新增檔案**：
- [ ] `docs/troubleshooting.md`

**涵蓋問題**：
- [ ] 連接問題
- [ ] 授權問題
- [ ] 效能問題
- [ ] Redis 相關問題

**驗收標準**：
- [ ] 每個問題有症狀、原因、解決方案
- [ ] 包含可複製的程式碼範例
- [ ] 除錯技巧實用

---

### 任務 5.4：撰寫安全指南

**新增檔案**：
- [ ] `docs/security.md`

**涵蓋主題**：
- [ ] 授權設計最佳實踐
- [ ] 輸入驗證
- [ ] 速率限制
- [ ] Redis 安全設定

**驗收標準**：
- [ ] 每個建議有正反範例
- [ ] 包含可直接使用的程式碼
- [ ] 涵蓋常見安全風險

---

### 任務 5.5：更新 README

**更新內容**：
- [ ] 新增進階使用範例
- [ ] 連結至詳細文件
- [ ] 更新功能列表
- [ ] 新增效能提示

**驗收標準**：
- [ ] README 涵蓋快速入門
- [ ] 連結指向正確文件
- [ ] 中英文 README 同步

---

## 文件結構規劃

```
packages/ripple/
├── README.md                    # 快速入門（更新）
├── README.zh-TW.md              # 繁體中文版（更新）
└── docs/
    ├── optimization-plan/       # 優化計劃（當前）
    ├── architecture/
    │   ├── overview.md          # 架構總覽
    │   ├── ADR-001-*.md         # 架構決策記錄
    │   ├── ADR-002-*.md
    │   └── ADR-003-*.md
    ├── troubleshooting.md       # 故障排除
    ├── security.md              # 安全指南
    └── api/
        └── reference.md         # API 參考（由 JSDoc 生成）
```

---

## 成功標準

- [ ] 所有公開 API 有完整 JSDoc
- [ ] 架構文件清晰完整
- [ ] 故障排除指南涵蓋常見問題
- [ ] 安全指南提供實用建議
- [ ] README 易於新手入門
- [ ] 中英文文件同步更新

---

## 風險緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 文件過時 | 中 | 在 PR review 中檢查文件更新 |
| 翻譯不一致 | 低 | 使用術語對照表 |
| 範例錯誤 | 中 | 測試所有文件中的程式碼 |

---

## 完成後的檢查清單

- [ ] 執行 `bun run docs` 生成 API 文件（如有設定）
- [ ] 檢查所有連結有效
- [ ] 請團隊成員審閱文件
- [ ] 更新 CHANGELOG.md

---

**優化計劃完成！**

返回 [README](./README.md) 查看完整計劃概覽。
