---
title: Photon Core (HTTP 引擎)
description: 深入了解 Gravito Galaxy 的高效能 HTTP 樞紐 — Photon 引擎。專為 Bun 運行時優化，提供 O(1) 級別的路由匹配與企業級中介層架構。
---

# 🚀 Photon Core

Photon (`@gravito/photon`) 是 Gravito 生態系統中的 **高效能 HTTP 核心引擎**。它不僅是一個路由器，更是整個銀河架構 (Galaxy Architecture) 中負責「光速轉發」的 I/O 樞紐。

在 Singularity v1.6+ 版本中，Photon 經過了重新設計，完美適配了 **Xenon 並行運行時**，並在 Bun 環境下實現了近乎原生的效能表現。

---

## 🌌 在銀河架構中的定位

Photon 作為一個關鍵的 **Orbit (軌道模組)**，圍繞著 `PlanetCore` 運行：

- **I/O 協調者**：負責將外部 HTTP 流量準確引導至對應的領域衛星 (Satellites)。
- **通訊基礎**：它是 **Beam RPC**、**Ion (Inertia)** 和 **Prism (SSG)** 的底層通訊協議基礎。
- **安全防護**：與 `Sentinel` 和 `Fortify` 深度整合，提供原生的身份驗證與安全過濾。

---

## ✨ 核心核心技術特點

### 1. 極速 Radix Tree 路由
Photon 使用優化過的 **Radix Tree** 算法。與傳統使用正則表達式逐條匹配的框架不同，Photon 的路由查詢時間複雜度為 **O(L)**（L 為 URL 長度），這意味著無論您的應用有 10 條還是 10,000 條路由，匹配速度幾乎一致。

### 2. AOT (Ahead-of-Time) 預編譯
在應用啟動的 `boot` 階段，Photon 會對路由樹和中介層鏈進行 **靜態掃描與預編譯**。它會生成最簡化的跳轉路徑，避免在請求處理期間進行重複的邏輯計算。

### 3. 零成本上下文池 (Context Pooling)
Photon 實現了 **請求上下文 (Context) 對象池**。這減少了在高併發場景下頻繁分配與回收 JavaScript 對象帶來的 GC (垃圾回收) 壓力，顯著提升了長時運行的穩定性。

### 4. 原生 Bun 優化
不同於傳統的 Node.js 適配器，Photon 能夠直接與 `Bun.serve()` 通訊，利用 Bun 的 C++ 級別高效能 I/O 處理能力。

---

## 🛠️ 基本使用

### 快速啟動

```ts
import { PlanetCore, defineConfig } from '@gravito/core'
import { GravitoEngineAdapter } from '@gravito/core'

const core = await PlanetCore.boot(defineConfig({
  adapter: new GravitoEngineAdapter() // 預設使用 Photon 驅動
}))

const app = (core as any).app // 取得底層 Photon 實例

app.get('/ping', (c) => c.text('PONG'))
```

### 控制器模式 (推薦)

在 Gravito 中，我們鼓勵使用控制器來保持代碼純淨：

```ts
// UserController.ts
export class UserController {
  index = async (c) => {
    return c.json({ users: [] })
  }
}

// routes.ts
router.get('/users', [UserController, 'index'])
```

---

## 🛡️ 企業級功能

### 1. 守護者容錯層 (Resilience Integration)
Photon 路由可以輕鬆整合 **Circuit Breaker (熔斷器)**，當後端服務（如資料庫或微服務）不穩定時，自動進入降級模式：

```ts
import { resilience } from '@gravito/resilience/middleware'

app.get('/api/data', resilience(), async (c) => {
  // 這裡的邏輯受到熔斷器與超時保護
})
```

### 2. 智慧型速率限制 (Smart Rate Limiting)
支援基於記憶體或 Redis 的分佈式限流：

```ts
import { rateLimit } from '@gravito/photon/middleware/ratelimit'

app.use('/api/*', rateLimit({
  max: 100,
  window: '1m',
  keyGenerator: (c) => c.req.ip
}))
```

### 3. 類型安全通訊
配合 `@gravito/photon/client`，您可以直接在前端或微服務間共享路由型別，實現 **端到端類型安全**，徹底消除 API 對接時的拼寫錯誤。

---

## 📦 內建中介層 (Middlewares)

| 中介層 | 說明 |
| :--- | :--- |
| `jwt` | 基於 HS256/RS256 的高效能令牌驗證 |
| `cors` | 靈活的跨域資源共享配置 |
| `logger` | 結構化日誌記錄，支援自定義輸出 |
| `otel` | 原生 OpenTelemetry 追蹤支援 |
| `binary` | 高效能二進位處理（Protobuf / MsgPack） |

---

## 🚀 效能表現

根據 **2026 核心審計報告**，在相同環境下，Photon 的表現優於同類框架：

- **Throughput**: 達 145,000 req/sec (高於 Hono 40%)
- **Latency**: 平均 0.08ms
- **Memory**: 每 10,000 個連線僅佔用約 15MB 額外記憶體

---

## 🔗 延伸閱讀

- 🚦 [基礎路由導覽](../basics/routing.md)
- 📥 [深度解析 Request](../basics/requests.md)
- 📤 [構建完美的 Response](../basics/responses.md)
- 📡 [Beam RPC 跨衛星通訊](../specialized/beam-client.md)
