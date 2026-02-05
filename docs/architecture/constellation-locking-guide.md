---
title: Constellation Distributed Locking Guide
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-02-02
---

# Constellation 分散式鎖定機制使用指南

本指南說明如何在 `@gravito/constellation` 中正確配置 and 使用分散式鎖定機制，以防止多實例環境中的「快取風暴」(Cache Stampede)。

## 快速開始

### 1. 安裝
```bash
bun add @gravito/constellation
```

### 2. 基本用法 (MemoryLock)
```typescript
import { OrbitSitemap, MemoryLock } from '@gravito/constellation'

const sitemap = OrbitSitemap.dynamic({
  baseUrl: 'https://example.com',
  lock: new MemoryLock(),
})
```

## 架構設計

### 鎖定流程

1. **請求進入**：使用者請求 `/sitemap.xml`
2. **檢查快取**：檢查 Storage 中是否有現成的 Sitemap
3. **快取未命中**：需要重新生成
4. **嘗試獲取鎖定**：
   - 成功 → 執行生成，寫入快取，釋放鎖定
   - 失敗 → 回傳 `503 Service Unavailable` with `Retry-After: 5`

### 元件分析

- **Lock Interface**: 定義了 `acquire` 與 `release` 契約。
- **MemoryLock**: 適合開發與單機部署。
- **RedisLock**: 適合分散式生產環境，基於原子操作確保互斥。

## API 參考

### Lock Interface
- `acquire(key: string, ttl: number): Promise<boolean>`
- `release(key: string): Promise<void>`

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

---

## 3. 配置選項

### RedisLock 配置參數

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `client` | `RedisClient` | - | Redis 客戶端實例（必填） |
| `keyPrefix` | `string` | `'sitemap:lock:'` | Redis 鍵值前綴 |
| `retryCount` | `number` | `0` | 獲取鎖定失敗後的重試次數 |
| `retryDelay` | `number` | `100` | 重試間隔（毫秒） |

---

## 4. 延伸閱讀

- [Constellation Architecture](./constellation.md) - 整體架構設計
- [RedLock 演算法](https://redis.io/docs/manual/patterns/distributed-locks/) - Redis 分散式鎖定原理
- [Cache Stampede](https://en.wikipedia.org/wiki/Cache_stampede) - 快取風暴問題說明
