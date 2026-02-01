---
title: Stasis Architecture 技術架構規格書
version: 2.0.0
status: Stable
tier: C
last_updated: 2026-02-01
---

# Stasis Architecture 技術架構規格書

## 模組概覽

**@gravito/stasis** 🧊 為 Gravito 框架提供高效能的快取與限流 Orbit。它提供統一的快取 API，支援多種存儲後端、分佈式鎖與整合式限流機制。

### 核心職責
- **Unified Cache API**: 提供簡單的 `get`, `put`, `remember` 等方法。
- **Multiple Storage Drivers**: 原生支援 Memory, Redis, File-based 快取。
- **Distributed Locks**: 防止競爭條件的原子跨進程鎖。
- **Flexible Caching (SWR)**: 支援 Stale-While-Revalidate 策略。
- **Integrated Rate Limiting**: 基於快取基礎設施的限流機制。

## 快速開始

### 1. 註冊 Orbit

```typescript
import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitStasis } from '@gravito/stasis'

const config = defineConfig({
  config: {
    cache: {
      default: 'memory',
      stores: {
        memory: { driver: 'memory', maxItems: 5000 },
        redis: { driver: 'redis', connection: 'default' }
      }
    }
  },
  orbits: [new OrbitStasis()]
})

const core = await PlanetCore.boot(config)
```

### 2. 基本快取操作

```typescript
const cache = core.container.make('cache')

// 簡單存儲
await cache.put('stats:total', 100, 3600) // 存儲 1 小時

// "Remember" 模式 (Get or Set)
const users = await cache.remember('users:all', 300, async () => {
  return await db.users.findMany()
})
```

---

## 架構設計

### 1. 核心哲學：Flexible Consistency

Stasis 的設計目標是在效能與一致性之間取得平衡。
- **Flexible Cache (SWR)**：支援「過期但可用」的快取策略，背景異步刷新，大幅降低用戶等待時間。
- **Distributed Locks**：跨節點的原子鎖，確保關鍵任務 (如 Cron Job 或庫存扣減) 不會重複執行。
- **Single-Flight (Coalescing)**：防止快取擊穿，確保高並發下後端資源請求的唯一性。
- **Driver Agnostic**：業務代碼無需修改即可從 Memory 切換到 Redis。

### 2. 模組組件分析

### 2.1 CacheManager (Orchestrator)
- **職責**：管理多個 Cache Store，提供高階 API (`remember`, `flexible`, `tags`)。
- **位置**：`src/CacheManager.ts`
- **機制**：
  - 懶加載 Store 實例。
  - 透過 `CacheRepository` 包裝底層 Store，注入前綴與事件邏輯。

### 2.2 Flexible Caching (SWR Engine)
- **職責**：實作 Stale-While-Revalidate 模式。
- **位置**：`src/CacheRepository.ts` -> `flexible()`
- **演算法**：
  1. 讀取主鍵 (`value`) 與 Metadata 鍵 (`freshUntil`)。
  2. 若 `now < freshUntil`，直接回傳 Value (Hit)。
  3. 若 `now < expiresAt` (但已過 Fresh 時間)，回傳 Stale Value，並在背景觸發 `refreshFlexible`。
  4. **防雪崩 (Stampede Protection)**：使用 `refreshSemaphore` (In-Memory) 與分散式鎖，確保同一時間只有一個請求去刷新後端數據。

### 2.3 RateLimiter (Throttling)
- **職責**：基於快取的限流器。
- **位置**：`src/RateLimiter.ts`
- **實作**：
  - 使用 `increment` 原子操作計數。
  - 若 Store 支援 TTL，則利用它自動過期；否則手動檢查 `reset` 時間。

### 2.4 FileStore (Persistence)
- **職責**：基於檔案系統的持久化快取。
- **位置**：`src/stores/FileStore.ts`
- **特點**：
  - **Atomic Writes**：寫入 `temp` 檔 -> `rename`，防止寫入中斷導致檔案損壞。
  - **Cleanup Daemon**：定期掃描並刪除過期檔案。
  - **Hashing**：將 Key 進行 SHA-256 雜湊作為檔名，避免檔案系統限制。

### 2.5 PredictiveStore (Smart Prefetching)
- **職責**：基於存取模式預測，提前預熱快取。
- **位置**：`src/stores/PredictiveStore.ts`
- **機制**：
  - **AccessTracker**：使用 Markov Chain (Order-1) 記錄 Key 的接續關係 (A -> B)。
  - **Auto-Prefetch**：當讀取 Key A 時，若預測 B 的機率高，則在背景觸發 `store.get(B)`。
  - **應用**：搭配 `TieredStore` 使用時，能自動將資料從 L2 (Redis) 預熱至 L1 (Memory)。

---

## 技術規格與設計決策

### 3.1 分散式鎖 (Distributed Locks)
- **Redis Driver**: 使用 `SET resource lock_id NX PX 10000` (Redlock 簡化版)。
- **File Driver**: 使用 `open(file, 'wx')` (Exclusive Create) 模擬原子鎖。
- **Memory Driver**: 使用簡單的 `Map` 標記。
- **API**: `lock(name, seconds).get(callback)` 確保鎖會自動釋放 (Finally Block)。

### 3.2 標籤 (Cache Tags)
- **支援度**: 僅部分 Driver (Redis, Memory) 完整支援。
- **實作**:
  - 每個 Tag 維護一個版本號 (Version/Timestamp)。
  - 儲存時 Key 包含 Tag 版本：`myapp:tag_v1:key`。
  - 清除 Tag 時，只需更新 Tag 版本號，舊 Key 自動失效 (Soft Invalidation)。

### 3.3 單機併發優化 (Promise Coalescing / Single-Flight)
- **機制**：使用 `coalesceSemaphore` (單機記憶體 Map)。
- **作用**：當多個請求同時存取同一個缺失的 Key 時，僅會執行一次 Callback (如資料庫查詢)，其餘請求共用該 Promise 的結果。
- **場景**：適用於 `remember()` 與帶有預設值 Callback 的 `get()` 操作。

### 3.4 透明壓縮 (Transparent Compression)
- **支援**：透過 `node:zlib` (Gzip) 實施。
- **觸發條件**：可設定 `minSize` 閾值 (預設 1KB)，僅針對大體積資料進行壓縮。
- **實作**：存儲時自動包裝為 `__gravito_compressed` 結構，讀取時自動解壓，對業務邏輯完全透明。

---

## API 參考

### CacheManager
- `cache.get(key, default?)`: 取得項目。
- `cache.put(key, value, ttl?)`: 存儲項目。
- `cache.remember(key, ttl, callback)`: 取得或執行回調並存儲。
- `cache.flexible(key, ttl, stale, callback)`: Stale-While-Revalidate。
- `cache.increment / decrement`: 原子數字更新。
- `cache.tags(['tag1']).flush()`: 依標籤失效。

---

## 風險分析與潛在問題

### 4.1 Flexible Cache 的記憶體風險
在高並發且大量 Key 過期的情況下，`refreshFlexible` 可能會在背景產生大量 Promise，佔用 Event Loop。
- **現況**：已透過 `refreshSemaphore` 在單機層面緩解。
- **優化**：未來應引入 `p-limit` 限制全域背景任務的並發度。

### 4.2 FileStore 的 I/O 瓶頸
`FileStore` 在高頻讀寫時受限於磁碟 IOPS。
- **場景**: 不適合高流量 API 的熱點快取。
- **定位**: 適合低頻、大體積的數據 (如 HTML 片段、報表結果)。

### 4.3 壓縮開銷 (Compression Overhead)
雖能減少 I/O 與存儲空間，但會增加 CPU 負擔。
- **建議**：僅在傳輸大對象 (如 > 10KB) 或存儲昂貴 (如 Cloud 託管 Redis 記憶體限制) 時開啟。

---

## 後續優化建議

### 短期 (v1.1) - ✅ 已完成
1. **Promise Coalescing**：在 `remember()` 中加入單機防擊穿邏輯。
2. **Compression**：支援對大 Value 進行 Gzip 壓縮。

### 中期 (v1.2) - ✅ 已完成
1. **Tiered Cache**：支援 L1 (Memory) + L2 (Redis) 多級快取架構。
2. **Circuit Breaker**：當 Redis 連線異常時，自動降級到 Local Memory 或暫時跳過快取。

### 長期 (v2.0) - ✅ 已完成
1. **Cache Predictions**：實作 `PredictiveStore` 與 `MarkovPredictor`，支援基於存取模式的自動預熱。



---
*Created by Gravito Architect.*
