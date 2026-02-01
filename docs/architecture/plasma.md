---
title: Plasma Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# Plasma Architecture 技術架構規格書

## 模組概覽

**Plasma** (`@gravito/plasma`) 是 Gravito 框架的高效能 Redis 驅動 Orbit。它專為 Bun Runtime 優化，原生支持 `Bun.redis` 以達到極致效能，同時兼容 Node.js 環境。

### 核心職責
- **Bun Native Integration**：直接調用 Bun 的原生 C++ Redis 綁定。
- **Connection Management**：支援多連線配置與懶加載。
- **Fluent API**：提供 Laravel 風格的鏈式呼叫介面。
- **Auto-Failover**：內建重連機制與錯誤標準化。

## 快速開始

### 1. 安裝
```bash
bun add @gravito/plasma
```

### 2. 註冊 Orbit
```typescript
import { OrbitPlasma } from '@gravito/plasma'

const config = defineConfig({
  config: {
    redis: {
      default: { host: 'localhost', port: 6379 }
    }
  },
  orbits: [new OrbitPlasma()]
})
```

### 3. 基本用法
```typescript
const redis = core.container.make('redis')
await redis.set('key', 'value')
const val = await redis.get('key')
```

---

## 架構設計

### 1. 核心哲學：Bun Native Redis

Plasma 專為 Bun runtime 打造，其核心目標是最大化利用 Bun 內建的高效能 TCP 與 Redis 實作 (`Bun.redis`)。
- **Zero Dependency**：在 Bun 環境下，Plasma 不依賴任何外部套件 (如 `ioredis` 或 `redis`)，直接調用原生的 C++ 綁定。
- **Compatibility**：提供 Laravel 風格的 Fluent API，同時保持與 `ioredis` 的高度相容性，以便在 Node.js 環境中無痛切換。

### 2. 模組組件分析

### 2.1 RedisManager (Connection Pool)
- **職責**：管理多個 Redis 連接 (e.g., default, cache, session)。
- **位置**：`src/RedisManager.ts`
- **機制**：
  - 支援 `configure()` 全局配置。
  - 懶加載 (Lazy Loading)：連接僅在首次呼叫 `connection('name')` 時建立。
  - 自動選擇驅動：根據環境 (`typeof Bun !== 'undefined'`) 自動切換 `BunRedisClient` 或 `RedisClient` (ioredis wrapper)。

### 2.2 BunRedisClient (Native Driver)
- **職責**：封裝 `Bun.redis`，提供標準化的 `RedisClientContract` 介面。
- **位置**：`src/clients/BunRedisClient.ts`
- **關鍵特性**：
  - **Auto Reconnect**：實作了帶有 Jitter 的指數退避重連機制。
  - **Pipeline**：模擬 `ioredis` 的 Pipeline API，但在底層使用 `Bun.redis` 的批次處理。
  - **Pub/Sub**：管理獨立的 Subscriber 連接 (因為 Redis 協議規定訂閱模式下的連接不能執行其他命令)。

### 2.3 OrbitPlasma (Integration)
- **職責**：將 Redis 服務注入到 Gravito 核心。
- **位置**：`src/OrbitPlasma.ts`
- **生命週期**：
  - `install()`: 註冊到 IoC 容器與 Context。
  - `disconnect()`: 監聽 `core:shutdown` Hook，確保應用關閉時釋放所有 TCP 連接。

---

## 技術規格與設計決策

### 3.1 為什麼優先使用 Bun.redis？
- **效能**：`Bun.redis` 是基於 Zig/C++ 實作的，比純 JS 的 `ioredis` 在序列化與 TCP 讀寫上快 2-5 倍。
- **記憶體**：更低的記憶體佔用，因為不需要維護複雜的 JS 物件狀態。

### 3.2 錯誤標準化 (Error Normalization)
不同驅動拋出的錯誤格式差異巨大。
- **策略**：所有錯誤均被捕獲並包裝為 `RedisError`。
- **好處**：上層應用 (如 Session Driver) 無需關心底層使用的是 Bun 還是 Node，錯誤處理邏輯一致。

### 3.3 Pipeline 實作細節
`BunRedisClient` 的 Pipeline 實作了一個命令緩衝區。
- **exec()**：當呼叫 `exec()` 時，並行發送所有緩衝的命令 (`Promise.all`)。
- **注意**：這與 Redis 原生 Pipeline (一次 syscall 發送所有命令) 略有不同，但在高並發下效果接近，且避免了 Head-of-Line Blocking 問題。

---

## API 參考

### RedisManager
- `connection(name?: string): RedisClient`
- `extend(name: string, driver: CustomDriver): void`

### RedisClient
- `get(key: string): Promise<string | null>`
- `set(key: string, value: string, ttl?: number): Promise<void>`
- `del(key: string | string[]): Promise<number>`
- `pipeline(): Pipeline`

---

## 風險分析與效能評估

### 4.1 Bun.redis 的功能完整性 ✅ 已實作
`Bun.redis` 目前仍處於實驗階段，某些進階命令 (如 Redis Cluster, Sentinel) 支援不全。
- **風險**：若應用依賴 Cluster 模式，必須強制切換回 `ioredis`。
- **解法**：✅ **已在 `RedisManager.ts` 中實作**，透過設定 `clientType: 'ioredis'` 即可強制使用 ioredis 驅動（見 `createClient()` 方法，第 123-145 行）。
- **實作位置**：`packages/plasma/src/RedisManager.ts`

### 4.2 連接洩漏 ✅ 已實作
在高並發或熱重載場景下，若未正確呼叫 `disconnect()`，可能導致 TCP 連接耗盡。
- **防護**：✅ **已在 `OrbitPlasma.ts` 中實作**：
  - 註冊了 `core:shutdown` Hook（第 158-161 行）
  - `RedisManager` 提供了 `disconnectAll()` 方法（第 173-179 行）以優雅關閉所有連接
  - 開發模式 (HMR) 下仍需注意，但核心防護機制已就位
- **實作位置**：
  - `packages/plasma/src/OrbitPlasma.ts` (Hook 註冊)
  - `packages/plasma/src/RedisManager.ts` (連接管理)

---

## 後續優化建議

### 短期 (v1.1)
1. **Cluster Support** ✅ **已實作**
   - **目標**：整合 `ioredis` 的 Cluster 功能，並在 `RedisManager` 中提供統一介面
   - **狀態**：
     - ✅ 新增 `RedisClusterClient` 類別，封裝 `ioredis.Cluster`
     - ✅ `RedisConfig` 新增 `cluster` 選項 (nodes, scaleReads, etc.)
     - ✅ `RedisManager` 自動識別 cluster 配置並實例化正確的客戶端
     - ✅ 保持 `RedisClientContract` 介面一致
   - **實作位置**：
     - `packages/plasma/src/RedisClusterClient.ts`
     - `packages/plasma/src/RedisManager.ts` (createClient 邏輯)

2. **Lua Script Registry** ✅ **已實作**
   - **目標**：提供管理 Lua 腳本的機制，自動計算 SHA1 並使用 `EVALSHA` 優化效能
   - **狀態**：
     - ✅ 已實作 `ScriptRegistry` 類別
     - ✅ 支援 `register()` 自動計算 SHA1
     - ✅ 支援 `execute()` 自動處理 `EVALSHA` 失敗時的 `EVAL` fallback
     - ✅ 在 `RedisManager` 與 `Redis` Facade 中提供 `scripts()` 存取點
   - **實作位置**：
     - `packages/plasma/src/ScriptRegistry.ts`
     - `packages/plasma/src/RedisManager.ts`

### 中期 (v1.2)
1. **Stream API** ✅ **已實作**
   - **目標**：完整支援 Redis Streams (`XADD`, `XREAD`, `XREADGROUP`, `XACK`, `XPENDING` 等)，為 `queue` 模組鋪路
   - **狀態**：
     - ✅ `RedisClientContract` 新增 Stream API 定義
     - ✅ `BunRedisClient` 與 `RedisClient` (ioredis) 均已實作
     - ✅ 支援 `XADD`, `XREAD`, `XREADGROUP`, `XGROUP`, `XACK`, `XLEN`, `XRANGE`, `XREVRANGE`, `XTRIM`, `XDEL`
     - ✅ `BunRedisClient` 處理了 Bun 原生 `send()` 返回格式差異 (Object vs Array)
   - **實作位置**：
     - `packages/plasma/src/types/index.ts` (類型定義)
     - `packages/plasma/src/clients/BunRedisClient.ts`
     - `packages/plasma/src/RedisClient.ts`

### 長期 (v2.0)
1. **RESP3 Protocol** ❌ **未實作**
   - **目標**：待 Bun 原生支援 RESP3 後跟進，提供更豐富的數據類型回傳 (如 Map, Set, Double 等)
   - **狀態**：當前使用 RESP2 協議，沒有 RESP3 相關配置或介面
   - **影響**：部分進階數據類型無法以原生形式返回，需額外解析


---
*Created by Gravito Architect.*
