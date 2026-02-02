---
title: Distributed Locking Guide
version: 1.0.0
status: Stable
last_updated: 2026-01-29
---

# Constellation 分散式鎖定機制使用指南

本指南說明如何在 `@gravito/constellation` 中正確配置和使用分散式鎖定機制，以防止多實例環境中的「快取風暴」(Cache Stampede)。

---

## 1. 為什麼需要分散式鎖定？

在 **Dynamic Mode** 下，若 Sitemap 快取失效時多個請求同時進入，會觸發多個實例同時生成 Sitemap，導致：
- **CPU 飆升**：所有實例同時執行昂貴的資料庫查詢與 XML 生成
- **資料庫壓力**：同一時間大量查詢湧入
- **記憶體浪費**：重複生成相同內容

**分散式鎖定機制**確保同一時間只有一個實例執行生成作業，其他實例會回傳 `503 Service Unavailable` 並提示稍後重試。

---

## 2. 可用的鎖定實作

### 2.1 MemoryLock（記憶體鎖定）

**適用場景**：
- 單實例部署（開發環境、小型應用）
- 本機測試環境
- 無 Redis 可用的環境

**限制**：
> **警告**：MemoryLock 使用本機記憶體儲存鎖定狀態，無法在多實例環境（Kubernetes、Docker Swarm）中共享鎖定資訊。若在生產環境使用，鎖定機制將失效。

**使用範例**：
```typescript
import { OrbitSitemap, MemoryLock } from '@gravito/constellation'

const sitemap = OrbitSitemap.dynamic({
  baseUrl: 'https://example.com',
  providers: [/* ... */],
  lock: new MemoryLock(),
  cacheSeconds: 3600
})
```

### 2.2 RedisLock（Redis 分散式鎖定）

**適用場景**：
- 多實例部署（Kubernetes、Docker Swarm、Auto-scaling）
- 生產環境
- 需要高可用性的應用

**技術特性**：
- 使用 Redis **SET NX EX** 原子操作
- Lua 腳本確保僅擁有者可釋放鎖定
- 支援重試機制（retry count & delay）
- 自動過期（TTL）防止死鎖

**使用範例**：
```typescript
import { OrbitSitemap, RedisLock } from '@gravito/constellation'
import { createClient } from 'redis'

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})
await redisClient.connect()

const sitemap = OrbitSitemap.dynamic({
  baseUrl: 'https://example.com',
  providers: [/* ... */],
  lock: new RedisLock({
    client: redisClient,
    keyPrefix: 'sitemap:lock:',  // Redis 鍵值前綴
    retryCount: 3,                // 失敗後重試次數
    retryDelay: 100               // 重試間隔（毫秒）
  }),
  cacheSeconds: 3600
})

sitemap.install(core)
```

---

## 3. 配置選項

### MemoryLock（無配置參數）

```typescript
const lock = new MemoryLock()
```

### RedisLock 配置參數

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `client` | `RedisClient` | - | Redis 客戶端實例（必填） |
| `keyPrefix` | `string` | `'sitemap:lock:'` | Redis 鍵值前綴 |
| `retryCount` | `number` | `0` | 獲取鎖定失敗後的重試次數 |
| `retryDelay` | `number` | `100` | 重試間隔（毫秒） |

**範例：高並發環境配置**
```typescript
const lock = new RedisLock({
  client: redisClient,
  keyPrefix: 'prod:sitemap:lock:',
  retryCount: 5,      // 最多重試 5 次
  retryDelay: 200     // 每次間隔 200ms
})
```

---

## 4. 鎖定行為詳解

### 鎖定流程

1. **請求進入**：使用者請求 `/sitemap.xml`
2. **檢查快取**：檢查 Storage 中是否有現成的 Sitemap
3. **快取未命中**：需要重新生成
4. **嘗試獲取鎖定**：
   - 成功 → 執行生成，寫入快取，釋放鎖定
   - 失敗 → 回傳 `503 Service Unavailable` with `Retry-After: 5`

### OrbitSitemap 中的鎖定邏輯

內部實作（參考 `OrbitSitemap.ts` 第 217-239 行）：

```typescript
if (opts.lock) {
  const locked = await opts.lock.acquire(filename, 60)
  if (!locked) {
    return new Response('Generating...', {
      status: 503,
      headers: { 'Retry-After': '5' },
    })
  }
}

try {
  const generator = new SitemapGenerator({
    ...opts,
    storage,
    filename: indexFilename,
  })
  await generator.run()
} finally {
  if (opts.lock) {
    await opts.lock.release(filename)
  }
}
```

**重點**：
- **TTL = 60 秒**：鎖定最多持續 60 秒（防止程序崩潰導致死鎖）
- **自動釋放**：使用 `finally` 確保鎖定必定釋放
- **HTTP 503 回應**：告知爬蟲稍後重試（避免誤判為停機）

---

## 5. 生產環境最佳實踐

### 5.1 使用 Redis Sentinel 或 Redis Cluster

確保 Redis 的高可用性：

```typescript
import { createClient } from 'redis'

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT || 6379)
  },
  password: process.env.REDIS_PASSWORD,
  // Sentinel 配置
  sentinels: [
    { host: 'sentinel1.example.com', port: 26379 },
    { host: 'sentinel2.example.com', port: 26379 }
  ],
  name: 'mymaster'
})

await redisClient.connect()
```

### 5.2 調整鎖定 TTL

根據 Sitemap 大小調整鎖定時間：

```typescript
// 若生成時間超過 60 秒，需要增加 TTL
if (opts.lock) {
  const TTL_SECONDS = 120  // 2 分鐘
  const locked = await opts.lock.acquire(filename, TTL_SECONDS * 1000)
  // ...
}
```

### 5.3 監控鎖定失敗

記錄鎖定失敗事件，以便監控並發壓力：

```typescript
if (!locked) {
  core.logger.warn(`[Sitemap] Lock acquisition failed for ${filename}`)
  core.hooks.emit('sitemap:lock:failed', { filename, timestamp: new Date() })
  return new Response('Generating...', {
    status: 503,
    headers: { 'Retry-After': '5' },
  })
}
```

---

## 6. 測試與驗證

### 本機測試（使用 MemoryLock）

```typescript
import { MemoryLock } from '@gravito/constellation'

const lock = new MemoryLock()

const acquired1 = await lock.acquire('test', 1000)
console.log(acquired1) // true

const acquired2 = await lock.acquire('test', 1000)
console.log(acquired2) // false（已被鎖定）

await lock.release('test')

const acquired3 = await lock.acquire('test', 1000)
console.log(acquired3) // true（已釋放）
```

### 整合測試（使用 RedisLock）

參考 `packages/constellation/tests/locks/` 中的測試範例。

---

## 7. 常見問題

### Q1：如何判斷應該使用哪種鎖定？

| 環境 | 實例數量 | 推薦鎖定 |
|------|----------|----------|
| 開發環境 | 1 | `MemoryLock` |
| 測試環境 | 1 | `MemoryLock` |
| 生產環境（單實例） | 1 | `MemoryLock` 或 `RedisLock` |
| 生產環境（多實例） | 2+ | **必須使用 `RedisLock`** |
| Kubernetes / Docker Swarm | 2+ | **必須使用 `RedisLock`** |

### Q2：Redis 連線失敗會怎樣？

`RedisLock.acquire()` 會捕獲異常並記錄錯誤，回傳 `false`（視為鎖定失敗）。建議配置 `retryCount` 以提高可靠性。

### Q3：如何驗證鎖定是否生效？

1. 在多個終端同時執行：
   ```bash
   curl http://localhost:3000/sitemap.xml
   ```
2. 觀察 Redis 鍵值：
   ```bash
   redis-cli KEYS "sitemap:lock:*"
   redis-cli GET "sitemap:lock:sitemap.xml"
   ```
3. 檢查日誌是否出現 `503 Generating...` 回應

---

## 8. 延伸閱讀

- [Constellation Architecture](./constellation.md) - 整體架構設計
- [RedLock 演算法](https://redis.io/docs/manual/patterns/distributed-locks/) - Redis 分散式鎖定原理
- [Cache Stampede](https://en.wikipedia.org/wiki/Cache_stampede) - 快取風暴問題說明
