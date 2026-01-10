# RFC: Gravito Core Standalone Engine

> **RFC Status**: Draft  
> **Created**: 2026-01-10  
> **Branch**: `feat/core-standalone-engine`

---

## 摘要 (Summary)

本提案將 `@gravito/core` 提煉為獨立的高性能 Web 引擎，讓不使用完整 Gravito 框架的開發者也能享受其性能優勢。目標是成為 **"The High-Performance Web Engine for Bun"**。

---

## 一、產品定義 (Product Definition)

### 1.1 定位

| 項目 | 描述 |
|------|------|
| **產品名稱** | Gravito Core Engine |
| **NPM 套件** | `@gravito/core/engine` |
| **核心價值** | 移除跨平台相容層包袱，只為 Bun 底層特性進行極致優化 |

### 1.2 目標群體

1. 對效能有極致要求的 Bun 使用者
2. 覺得 Hono 依然太重、或想追求比 Hono 更低延遲的開發者
3. 需要構建高性能微服務、API 網關的系統工程師

### 1.3 核心賣點

```
通用框架（Node/Deno/Bun）為了相容性，犧牲了 20% 的潛在效能。
Gravito Core 選擇偏心。我們只服務 Bun，因此我們能釋放 Bun 的全部潛力。
```

---

## 二、技術規格 (Technical Specification)

### 2.1 架構概覽

```
┌────────────────────────────────────────────────────────────┐
│                    @gravito/core                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐      ┌──────────────────────────┐   │
│  │  engine/         │      │  PlanetCore              │   │
│  │  (Standalone)    │      │  (Full Framework)        │   │
│  │                  │      │                          │   │
│  │  • Gravito       │      │  • ServiceProvider       │   │
│  │  • FastContext   │      │  • Container             │   │
│  │  • AOTRouter     │      │  • HookManager           │   │
│  │                  │      │  • Orbit mounting        │   │
│  └────────┬─────────┘      └────────────┬─────────────┘   │
│           │                             │                  │
│           └──────────┬──────────────────┘                  │
│                      ▼                                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              Shared Infrastructure                    │ │
│  │  • RadixRouter  • HTTP Types  • Middleware Types     │ │
│  └──────────────────────────────────────────────────────┘ │
│                      │                                     │
│                      ▼                                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                   Bun.serve                           │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 2.2 核心優化技術

#### 2.2.1 Bun-Native Bridge (零拷貝)

**問題**: 傳統框架會將 `Bun.serve` 的原始 Request 包裝多層，產生不必要的記憶體分配。

**解決方案**:
- 直接處理 `Bun.serve` 傳入的原始 `Request` 物件
- 延遲解析：只在真正需要時才解析 headers、query、body
- 使用 `Bun.peek` 或底層 Buffer 操作減少資料複製

```typescript
// Before: 每次請求創建多個物件
const ctx = new Context(new RequestWrapper(new HeadersParser(request)))

// After: 最小化物件創建
const ctx = acquireContext(request) // 從池中獲取
```

#### 2.2.2 AOT Router (預編譯路由)

**問題**: 運行時路由匹配需要遍歷樹結構，即使是靜態路由。

**解決方案**:
- 啟動時將路由路徑編譯為最佳化的判斷邏輯
- 靜態路徑採用 Hash Map 匹配 (O(1))
- 動態路徑採用特化的正則優化

```typescript
// 路由編譯示意
class AOTRouter {
  // 靜態路由: 直接 Map 查找
  private staticMap = new Map<string, Handler>()
  
  // 動態路由: 優化的 Radix Tree
  private dynamicTree: RadixNode
  
  match(method: string, path: string): MatchResult {
    // O(1) 靜態查找
    const staticHandler = this.staticMap.get(`${method}:${path}`)
    if (staticHandler) return { handler: staticHandler, params: {} }
    
    // 動態查找
    return this.dynamicTree.match(method, path)
  }
}
```

#### 2.2.3 Context 資源池 (Object Pooling)

**問題**: 每個請求創建新的 Context 物件，GC 壓力大。

**解決方案**:
- 實作內部池化機制，重複使用 `Context` 物件
- 目標：將每個請求的記憶體分配（Allocation）降至接近零

```typescript
const POOL_SIZE = 256
const pool: FastContext[] = []

export function acquireContext(request: Request): FastContext {
  const ctx = pool.pop() ?? new FastContext()
  return ctx.reset(request)
}

export function releaseContext(ctx: FastContext): void {
  if (pool.length < POOL_SIZE) {
    pool.push(ctx)
  }
}
```

### 2.3 API 設計

#### 與 Hono 的對照

```typescript
// ═══════════════════════════════════════════════════════════
// Hono (對照組)
// ═══════════════════════════════════════════════════════════
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ message: 'Hello' }))
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})

app.use('*', async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
})

export default app

// ═══════════════════════════════════════════════════════════
// Gravito Core Engine (99% 相容)
// ═══════════════════════════════════════════════════════════
import { Gravito } from '@gravito/core/engine'

const app = new Gravito()

app.get('/', (c) => c.json({ message: 'Hello' }))
app.get('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id })
})

app.use('*', async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
})

export default app
```

#### Gravito 類 API

```typescript
class Gravito {
  // HTTP 方法
  get(path: string, ...handlers: Handler[]): this
  post(path: string, ...handlers: Handler[]): this
  put(path: string, ...handlers: Handler[]): this
  delete(path: string, ...handlers: Handler[]): this
  patch(path: string, ...handlers: Handler[]): this
  options(path: string, ...handlers: Handler[]): this
  
  // 中間件
  use(path: string, ...middleware: Middleware[]): this
  use(...middleware: Middleware[]): this
  
  // 路由群組
  route(path: string, app: Gravito): this
  
  // 啟動相關
  fetch(request: Request): Response | Promise<Response>
  
  // 錯誤處理
  onError(handler: ErrorHandler): this
  notFound(handler: NotFoundHandler): this
}
```

---

## 三、目錄結構

```
packages/core/src/
├── engine/                      # 🆕 獨立引擎
│   ├── index.ts                 # 引擎導出
│   ├── Gravito.ts              # 主要入口類
│   ├── FastContext.ts          # 池化 Context
│   ├── AOTRouter.ts            # 預編譯路由器
│   ├── types.ts                # 引擎專用類型
│   └── pool.ts                 # 物件池實作
│
├── adapters/
│   └── bun/
│       ├── RadixRouter.ts      # 現有 (被 AOTRouter 重用)
│       ├── RadixNode.ts        # 現有
│       └── ...
│
├── http/
│   └── types.ts                # 共用 HTTP 類型定義
│
├── PlanetCore.ts               # 現有完整框架 (不變動)
└── index.ts                    # 主導出 (新增 engine 重導出)
```

---

## 四、執行藍圖 (Roadmap)

### 第一階段：核心提煉 (MVP) - Week 1-2

| 任務 | 描述 | 狀態 |
|------|------|------|
| API 設計 | 定義 `Gravito` 類 API 表面 | 🔲 |
| FastContext | 實作池化 Context | 🔲 |
| AOTRouter | 實作預編譯路由器 | 🔲 |
| 基礎路由 | GET/POST/PUT/DELETE/PATCH | 🔲 |
| 中間件支援 | use() 全域與路徑中間件 | 🔲 |
| Benchmark | 對比 Hono 的基準測試 | 🔲 |

**目標**: RPS 高於 Hono 20%+

### 第二階段：開發者體驗 (DX) - Week 3

| 任務 | 描述 | 狀態 |
|------|------|------|
| TypeScript | 完善型別推導 | 🔲 |
| 遷移指南 | 「5 分鐘從 Hono 遷移」 | 🔲 |
| 文件站 | 獨立引擎文件 | 🔲 |

### 第三階段：生態與推廣 - Week 4

| 任務 | 描述 | 狀態 |
|------|------|------|
| Benchmark 工具 | 官方對比工具 | 🔲 |
| 社群分享 | Twitter/Discord/Reddit | 🔲 |
| Atlas 整合 | ORM 原生對接範例 | 🔲 |

---

## 五、官網說服模組規劃

### 5.1 透明對比

即時 Benchmark 展示：

```
┌─────────────────────────────────────────────────────────────┐
│  Requests per Second (Higher is Better)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Gravito  ████████████████████████████████  152,000 req/s  │
│  Elysia   █████████████████████████████     140,000 req/s  │
│  Hono     ████████████████████████          120,000 req/s  │
│                                                             │
│  Tested on: MacBook Pro M3, Bun 1.1.x, 1000 concurrent     │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 代碼映射

展示 Hono → Gravito 的 1:1 語法對應，消除遷移成本恐懼。

### 5.3 黑科技揭秘

視覺化呈現：
- 「零拷貝」原理動畫
- 「物件池」生命週期圖
- 「AOT 編譯」路由樹轉換過程

---

## 六、成功指標

| 指標 | 目標值 | 測量方式 |
|------|--------|----------|
| 靜態路由 RPS | > Hono +20% | Benchmark suite |
| 動態路由 RPS | > Hono +15% | Benchmark suite |
| 每請求記憶體分配 | < 1KB | Bun profiler |
| 啟動時間 (1000 routes) | < 10ms | Startup benchmark |
| 套件大小 (minified) | < 10KB | Bundler analysis |

---

## 七、風險與緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 性能無法達標 | 核心賣點失效 | 持續 profiling，必要時調整目標 |
| API 與 Hono 差異過大 | 遷移成本高 | 嚴格遵循 Hono API 設計 |
| 池化導致記憶體洩漏 | 穩定性問題 | 完善的釋放機制與監控 |

---

## 附錄：參考資料

- [Hono GitHub](https://github.com/honojs/hono)
- [Elysia GitHub](https://github.com/elysiajs/elysia)
- [Bun HTTP Server Benchmark](https://bun.sh/docs/api/http)
