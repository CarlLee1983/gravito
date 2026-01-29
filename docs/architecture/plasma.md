---
title: Plasma Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Plasma Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/plasma` 的內部架構、Bun 原生整合策略以及多連接管理機制。

---

## 1. 核心哲學：Bun Native Redis

Plasma 專為 Bun runtime 打造，其核心目標是最大化利用 Bun 內建的高效能 TCP 與 Redis 實作 (`Bun.redis`)。
- **Zero Dependency**：在 Bun 環境下，Plasma 不依賴任何外部套件 (如 `ioredis` 或 `redis`)，直接調用原生的 C++ 綁定。
- **Compatibility**：提供 Laravel 風格的 Fluent API，同時保持與 `ioredis` 的高度相容性，以便在 Node.js 環境中無痛切換。

---

## 2. 模組組件分析

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

## 3. 技術規格與設計決策

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

## 4. 潛在風險與效能評估

### 4.1 Bun.redis 的功能完整性
`Bun.redis` 目前仍處於實驗階段，某些進階命令 (如 Redis Cluster, Sentinel) 支援不全。
- **風險**：若應用依賴 Cluster 模式，必須強制切換回 `ioredis`。
- **解法**：在配置中設定 `clientType: 'ioredis'`。

### 4.2 連接洩漏
在高並發或熱重載場景下，若未正確呼叫 `disconnect()`，可能導致 TCP 連接耗盡。
- **防護**：`OrbitPlasma` 嚴格綁定了 `core:shutdown` 事件，但在開發模式 (HMR) 下仍需注意。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **Cluster Support**：整合 `ioredis` 的 Cluster 功能，並在 `RedisManager` 中提供統一介面。
2. **Lua Script Registry**：提供管理 Lua 腳本的機制，自動計算 SHA1 並使用 `EVALSHA` 優化效能。

### 中期 (v1.2)
1. **Stream API**：完整支援 Redis Streams (`XADD`, `XREADGROUP`)，為 `queue` 模組鋪路。

### 長期 (v2.0)
1. **RESP3 Protocol**：待 Bun 原生支援 RESP3 後跟進，提供更豐富的數據類型回傳 (如 Map, Set)。

---
*Created by Gravito Architect.*
