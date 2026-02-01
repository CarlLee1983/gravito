---
title: Beam Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Beam Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/beam` 的內部架構、型別推斷機制以及零運行時開銷 (Zero Runtime Overhead) 的設計策略。

---

## 1. 核心哲學：Lightweight & Type-Safe

`@gravito/beam` 是專為 Gravito 生態系設計的輕量級 RPC 客戶端。它的核心目標是提供類似 tRPC 的開發體驗，但完全基於標準的 Web Fetch API 與 TypeScript 推斷，無需額外的程式碼生成步驟。

### 核心原則
- **Zero Runtime Overhead**：在預設情況下，它只是 `@gravito/photon/client` 的型別封裝，無任何額外邏輯。
- **Type Inference**：直接從後端 `Photon` 實例推斷型別，實現前後端型別同步。
- **Progressive Enhancement**：僅在需要進階功能（如攔截器、重試）時才引入額外的 Fetch Wrapper。

---

## 2. 模組組件分析

### 2.1 Factory (Entrypoint)
- **職責**：建立客戶端實例，並根據配置決定是否啟用增強模式。
- **位置**：`src/index.ts`
- **關鍵邏輯**：
  ```typescript
  export function createBeam(baseUrl, options) {
    // Fast Path: 若無進階選項，直接返回原生客戶端 (零開銷)
    if (!options?.timeout && !options?.retry && ...) {
      return beamClient(baseUrl, options)
    }
    // Slow Path: 啟用增強型 Fetch
    return beamClient(baseUrl, { ...options, fetch: createEnhancedFetch(options) })
  }
  ```

### 2.2 Middleware Pipeline (Enhanced Fetch)
- **職責**：處理逾時、重試、攔截器與標頭解析。
- **位置**：`src/index.ts` -> `createEnhancedFetch`
- **執行順序**：
  1. **Header Resolution**：解析動態標頭（支援 Async Function）。
  2. **OnRequest**：請求前攔截器。
  3. **Fetch Execution**：執行實際請求（封裝了 Timeout）。
  4. **Retry Logic**：若失敗則根據策略進行指數退避重試。
  5. **OnResponse**：回應後攔截器。
  6. **OnError**：錯誤處理攔截器（注意：錯誤仍會被拋出）。

### 2.3 Error System
- **職責**：提供結構化的錯誤類型，便於前端捕捉與處理。
- **位置**：`src/errors.ts`
- **類別層次**：
  - `BeamError` (Base)
    - `BeamNetworkError` (網路層級錯誤，如 DNS 失敗)
    - `BeamTimeoutError` (請求逾時)
    - `BeamHttpError` (HTTP 4xx/5xx)

---

## 3. 技術規格與設計決策

### 3.1 為什麼選擇 Type-Only Import？
Beam 鼓勵使用 `import type { AppType }` 引入後端定義。
- **優點**：確保前端 Bundle 完全不包含後端程式碼，僅在編譯時使用型別資訊。
- **實作**：`createBeam<T>` 的泛型 `T` 接受 `Photon` 實例類型，透過 TypeScript 的 `Infer` 機制自動展開路由結構。

### 3.2 Fast Path 優化策略
為了確保極致效能，Beam 採用了「條件式封裝」策略。
- **決策**：大多數簡單請求不需要攔截器或重試邏輯。
- **效果**：在未啟用進階選項時，Beam 的運行時開銷為 **0ms**（完全等同於直接呼叫 `hc`）。
- **權衡**：這增加了 `createBeam` 函數的複雜度，但換取了更好的預設效能。

### 3.3 動態標頭解析 (Dynamic Headers)
為了支援現代 Auth 流程（如短效 Token 自動刷新），`headers` 選項支援異步函數。
- **設計**：`() => Promise<Record<string, string>>`
- **場景**：在發送請求前，前端可檢查 Token 是否過期並自動刷新，確保請求帶上最新的 Token。

---

## 4. 潛在風險與效能評估

### 4.1 型別推斷效能 (TypeScript Performance)

#### 風險描述
對於擁有數千個路由的超大型應用，TypeScript 的型別推斷可能會顯著變慢，影響開發體驗。

#### 緩解策略
**1. 路由模組化**：推薦分割型別定義。
**2. 使用 TypeScript Project References**：利用增量編譯優化 IDE 速度。

---

### 4.2 記憶體洩漏風險 (Intercept Chaining)

#### 風險描述
若 `onRequest` 或 `onResponse` 攔截器中包含閉包引用大型物件且未釋放，可能導致記憶體洩漏。

#### 緩解策略
1. **避免在攔截器中累積狀態**：使用 WeakMap 代替 Map。
2. **實作定期清理**：若必須使用 Map，加入 TTL 機制。

---

### 4.3 重試風暴 (Retry Storm)

#### 風險描述
內建的重試機制若配置不當（如所有客戶端同時重試），可能導致後端雪崩效應。

#### 緩解策略 (✅ v1.1 已優化)
**實作 Jitter (抖動)**：在 v1.1 中，我們為指數退避增加了隨機抖動 (±20%)，確保重試請求在時間軸上均勻分佈。

```typescript
const client = createBeam<AppType>('/api', {
  retry: {
    count: 3,
    jitter: true // ✅ 已實作：防止重試風暴
  }
})
```

---

### 4.4 Bundle Size 影響

#### 優化策略
1. **Tree-shaking**：確保僅打包使用的功能。
2. **條件式載入**：正在評估延遲載入重試邏輯。

---

### 4.5 動態標頭解析效能

#### 風險描述
若 `headers` 選項設定為異步函數，每次請求都會執行該函數，可能成為效能瓶頸。

#### 緩解策略 (✅ v1.1 已優化)
**快取標頭解析器**：新增 `createCachedHeaderResolver` 工具，允許對高開銷的標頭（如透過網路刷新的 Token）進行 TTL 快取。

```typescript
import { createCachedHeaderResolver } from '@gravito/beam'

const client = createBeam<AppType>('/api', {
  headers: createCachedHeaderResolver(async () => {
    return { Authorization: `Bearer ${await getToken()}` }
  }, 60000) // 快取 1 分鐘
})
```

---

### 4.6 型別安全性邊界

#### 風險描述
Beam 依賴 TypeScript 型別推斷，但在後端與前端定義不同步或使用 `any` 時可能失效。

#### 防護策略 (✅ v1.1 已優化)
**執行時驗證**：新增 `validateResponse` 工具，支援使用 Zod 等 Schema 對回傳資料進行執行時檢查，彌補編譯時型別檢查的不足。

```typescript
import { validateResponse } from '@gravito/beam'
import { z } from 'zod'

const res = await client.users.$get()
const data = await validateResponse(res, z.object({ id: z.number() }))
```

---

## 5. 後續優化建議

### 優先級評估矩陣

| 功能 | 影響力 | 實作成本 | 優先級 | 目標版本 |
|------|--------|----------|--------|----------|
| Jitter 支援 | 🔥🔥🔥 高 | 🟢 低 | P0 | ✅ v1.1 |
| AbortSignal 整合 | 🔥🔥 中 | 🟢 低 | P1 | ✅ v1.1 |
| 請求去重 | 🔥🔥 中 | 🟡 中 | P2 | v1.2 |
| React Server Actions | 🔥 低 | 🔴 高 | P3 | v2.0 |
| 離線佇列機制 | 🔥🔥 中 | 🔴 高 | P3 | v2.0 |
| WebSocket 支援 | 🔥 低 | 🔴 高 | P4 | v2.x |

---

### 短期優化 (v1.1)

#### 5.1 新增 Jitter 支援 (✅ 已實作)

**問題陳述**
目前重試機制使用固定的指數退避，可能導致所有客戶端在同一時間點重試，造成流量突波。

**技術方案**
```typescript
// 新增 API 設計
interface BeamOptions {
  retry?: number
  retryDelay?: number
  retryBackoff?: number
  retryJitter?: boolean | number  // true = 50% jitter, 或自訂百分比
}

// 實作範例
function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  backoff: number,
  jitter: boolean | number
): number {
  const delay = baseDelay * Math.pow(backoff, attempt)

  if (!jitter) return delay

  const jitterPercent = typeof jitter === 'number' ? jitter : 0.5
  const minDelay = delay * (1 - jitterPercent)
  const maxDelay = delay * (1 + jitterPercent)

  return minDelay + Math.random() * (maxDelay - minDelay)
}
```

**預期效益**
- 減少 70-80% 的流量突波
- 提升後端在高負載下的穩定性
- 無破壞性變更（預設關閉）

**實作成本**：~4 小時（含測試）

---

#### 5.2 支援 AbortSignal 整合 (✅ 已實作)

**問題陳述**
使用者需要手動管理 `AbortController`，無法在 Beam 層級統一處理請求取消。

**技術方案 (已實作)**
```typescript
// 方案 A：全域 signal（已支援）
const controller = new AbortController()

const client = createBeam<AppType>('/api', {
  signal: controller.signal  // 全域取消信號
})

// 方案 B：與 timeout 自動合併（已實作）
const client = createBeam<AppType>('/api', {
  timeout: 5000,
  signal: controller.signal  // 自動合併 timeout 與 user signal
})

// 使用範例
setTimeout(() => controller.abort(), 1000) // 1 秒後取消所有請求
```

**實作細節**
- ✅ 新增 `mergeAbortSignals` 工具函式，支援合併多個 AbortSignal
- ✅ `createFetchWithTimeout` 現在接受 `userSignal` 參數
- ✅ 自動區分 timeout abort 與 user abort，拋出正確的錯誤類型
- ✅ 完全向後相容，不影響現有程式碼

**向後相容性**
- ✅ 完全向後相容
- 新增選填參數，不影響現有程式碼

**預期效益**
- 提升使用者體驗（快速取消不必要的請求）
- 減少無效網路流量
- 統一取消邏輯管理

**實作成本**：~4 小時（含測試）

---

### 中期優化 (v1.2)

#### 5.3 請求去重 (Deduplication)

**問題陳述**
在 React 應用中，相同的 GET 請求可能在短時間內被多次發起（如多個元件同時掛載），造成網路資源浪費。

**技術方案**
```typescript
// 實作概念：Request Deduplication Cache
class RequestDeduplicator {
  private cache = new Map<string, Promise<Response>>()

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const key = this.generateKey(url, init)

    // 若已有進行中的請求，直接返回
    if (this.cache.has(key)) {
      return this.cache.get(key)!.then(res => res.clone())
    }

    // 發起新請求
    const promise = fetch(url, init).finally(() => {
      this.cache.delete(key) // 清理完成的請求
    })

    this.cache.set(key, promise)
    return promise.then(res => res.clone())
  }

  private generateKey(url: string, init?: RequestInit): string {
    // 僅針對 GET 請求進行去重
    if (init?.method && init.method !== 'GET') {
      return `${Math.random()}` // 強制唯一
    }
    return `${url}::${JSON.stringify(init?.headers || {})}`
  }
}

// API 設計
const client = createBeam<AppType>('/api', {
  deduplicate: true,  // 啟用去重
  deduplicateTimeout: 1000  // 1 秒內的相同請求會被去重
})
```

**權衡分析**
| 優點 | 缺點 |
|------|------|
| 減少 50-70% 重複請求 | 增加記憶體使用（需管理快取） |
| 提升載入速度 | 可能導致資料新鮮度問題 |
| 降低後端負載 | 增加程式碼複雜度 |

**預期效益**
- 在 React 應用中減少 50-70% 的重複 GET 請求
- 提升頁面載入速度 20-30%
- 降低後端 QPS

**破壞性變更評估**
- ⚠️ 可能影響即時性要求高的應用
- 建議：預設關閉，由使用者選擇啟用

**實作成本**：~12 小時（含邊界測試）

---

#### 5.4 離線佇列機制 (Offline Queue)

**問題陳述**
在行動裝置或網路不穩定環境下，使用者操作可能因網路中斷而失敗。

**技術方案**
```typescript
// API 設計
const client = createBeam<AppType>('/api', {
  offlineQueue: {
    enabled: true,
    storage: 'indexedDB',  // 或 'localStorage'
    maxSize: 100,          // 最多快取 100 個請求
    retryOnReconnect: true // 網路恢復時自動重試
  }
})

// 監聽佇列事件
client.on('queuedRequest', (req) => {
  console.log('請求已加入離線佇列', req)
})

client.on('queueDrained', () => {
  console.log('離線佇列已清空')
})
```

**實作挑戰**
- 需處理請求順序性（如：先建立使用者，再建立訂單）
- IndexedDB 操作複雜度
- 佇列大小限制與清理策略

**預期效益**
- 提升行動端使用者體驗
- 減少因網路問題導致的資料遺失

**實作成本**：~20 小時

---

### 長期優化 (v2.0)

#### 5.5 React Server Actions 深度整合

**願景**
在 Next.js App Router 環境下，Beam 應提供與 Server Actions 同等的開發體驗。

**技術探索方向**
```typescript
// 目標 API（概念驗證）
// app/actions.ts (Server)
export const createUser = beamAction(async (data: UserInput) => {
  'use server'
  return await db.users.create(data)
})

// app/page.tsx (Client)
import { createUser } from './actions'

export default function Page() {
  const handleSubmit = async (formData: FormData) => {
    const result = await createUser({
      name: formData.get('name') as string
    })
    // 型別安全 + 自動序列化
  }
}
```

**實作挑戰**
- Next.js Server Actions 的內部機制複雜
- 需處理序列化限制（如 Date、BigInt）
- 與現有 Beam API 的整合方式

**預期效益**
- 統一前後端開發體驗
- 減少 API 路由樣板程式碼
- 完整的型別安全

**實作成本**：~40 小時（需深入研究 Next.js 內部）

---

#### 5.6 WebSocket 與即時通訊支援

**問題陳述**
目前 Beam 僅支援 HTTP 請求，無法處理即時通訊場景。

**技術方案草案**
```typescript
// API 設計概念
const client = createBeam<AppType>('/api', {
  websocket: {
    enabled: true,
    reconnect: true,
    heartbeat: 30000
  }
})

// 訂閱即時資料
const unsubscribe = client.notifications.$subscribe((data) => {
  console.log('新通知', data)
})

// 發送訊息
await client.chat.$send({ message: 'Hello' })
```

**實作挑戰**
- 需設計統一的 WebSocket + HTTP API
- 處理連線狀態管理
- 型別推斷複雜度

**預期效益**
- 支援即時通訊場景
- 統一的型別安全體驗

**實作成本**：~60 小時

---

### 相容性與遷移規劃

#### 語義化版本承諾
- **v1.x**：保證向後相容，僅新增功能
- **v2.0**：可能包含破壞性變更，提供自動化遷移工具

#### 遷移策略（v1 → v2）
// 提供 Codemod 自動轉換
```bash
npx @gravito/beam-codemod migrate-to-v2
```

// 或提供相容層
```typescript
import { createBeam } from '@gravito/beam/compat'
```

#### 廢棄政策
- 新功能將在至少 **2 個主要版本** 內保持相容
- 廢棄功能會在移除前提供至少 **6 個月** 的警告期

---
*Created by Gravito Architect.*
