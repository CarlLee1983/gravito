# 待完成優化工作清單

> **更新日期**: 2026-02-21
> **狀態**: 根據深度代碼審查（Phase 08）重新整理
> **目標**: 追蹤所有已識別但未實現的優化項目

---

## 優先級總覽

### 🔴 P1 優先級（關鍵、影響大、應立即著手）

| 項目 | 位置 | 問題描述 | 預估提升 | 複雜度 | 狀態 |
|-----|------|--------|--------|-------|------|
| **Body Payload 快取機制** | MinimalContext/FastContext | Request Body 重複讀取會崩潰 | 5-10% | 低 | 📋 計劃中 |
| **MinimalContext Query 快取** | MinimalContext.ts:78 | `queries()` 每次都重建物件 | 5-8% | 低 | 📋 計劃中 |
| **基準測試基線建立** | N/A | 必須先建立性能基線再優化 | - | 中 | 📋 計劃中 |

### 🟠 P2 優先級（高影響、需要進行）

| 項目 | 位置 | 問題描述 | 預估提升 | 複雜度 | 狀態 |
|-----|------|--------|--------|-------|------|
| **中間件鏈預編譯** | Gravito.ts | 中間件每次動態生成 | 10-15% | 中 | 📋 計劃中 |
| **AOTRouter 中間件快取** | AOTRouter.ts | collectMiddleware 每次都搜索 | 5-10% | 低 | 📋 計劃中 |
| **Headers Object Spread 優化** | MinimalContext.ts:151 | getHeaders() 每次進行淺複製 | 2-3% | 低 | 📋 計劃中 |

### 🟡 P3 優先級（中等影響）

| 項目 | 位置 | 問題描述 | 預估提升 | 複雜度 | 狀態 |
|-----|------|--------|--------|-------|------|
| **PhotonAdapter Proxy 消除** | PhotonAdapter.ts | Proxy 無法被 JS 引擎優化 | 15-25% | 高 | 📋 計劃中 |
| **FastContext Headers 池化** | FastContext.ts | Headers 創建開銷 | 待驗證 | 低 | 📋 計劃中 |

### 🟢 P4 優先級（低優先、可選優化）

| 項目 | 位置 | 問題描述 | 預估提升 | 複雜度 | 狀態 |
|-----|------|--------|--------|-------|------|
| **Container Symbol Key** | Container.ts | 新增 Symbol 支援 | 2-3% | 低 | 📋 計劃中 |
| **JSON 序列化快取** | 靜態路由 | 預序列化靜態響應 | 1-2% | 低 | 📋 計劃中 |
| **Request Body 快取** | FastContext.ts | 快取 .json()/.text() 結果 | 3-5% | 低 | 📋 計劃中 |

### ✅ 已完成（無需重複）

| 項目 | 位置 | 完成狀態 |
|-----|------|--------|
| 路徑提取優化 | path.ts | ✅ 已實現（無 URL 物件） |
| RequestScope Phase 1-3 | Container/ | ✅ 已實現及測試 |

---

## 詳細工作項

### Phase 0: 基準測試基線建立 ⏳

**優先級**: P1（必須先做）
**預估工作量**: 2-3 天

#### 0.1 基準測試套件設計
- [ ] 設計 mitata 基準測試（中間件鏈、路由匹配、Context 創建）
- [ ] 設計 oha/wrk HTTP 負載測試（空路由、3中間件、動態路由）
- [ ] 記錄當前性能基線
- **參考文件**: `00-baseline.md`

#### 0.2 基線數據記錄
- [ ] 空路由 RPS
- [ ] 3 中間件路由 RPS
- [ ] Context 創建時間（pooled vs non-pooled）
- [ ] 記憶體/請求
- [ ] p50/p99 延遲

**完成標準**: 建立 `baseline-results.json`，包含上述所有指標

---

### Phase 1: Body Payload 快取機制 ⏳

**優先級**: P1
**預估工作量**: 1-2 天
**影響範圍**: MinimalContext, FastContext

#### 1.1 問題分析

當 Middleware 讀取 Request Body 後，Handler 再度讀取會觸發：
```
TypeError: Body has already been consumed
```

**現狀**: 無快取機制，每次 `.json()`/`.text()` 都直接呼叫底層 Request

#### 1.2 實現方案

```typescript
// MinimalRequest
private _cachedBody: unknown | undefined
private _bodyCacheReady = false

async json<T = unknown>(): Promise<T> {
  if (!this._bodyCacheReady) {
    this._cachedBody = await this._request.json()
    this._bodyCacheReady = true
  }
  return this._cachedBody as T
}
```

- [ ] 在 MinimalRequest 添加 `_cachedBody` 和 `_bodyCacheReady`
- [ ] 實現 `json()` 快取邏輯
- [ ] 實現 `text()` 快取邏輯
- [ ] MinimalContext.reset() 時清除快取
- [ ] FastContext 添加同樣快取（已有 `_cachedJsonBody` 但需完善）
- [ ] 單元測試（Body 讀取、快取驗證、多次讀取）
- [ ] 集成測試（Middleware + Handler body 讀取場景）

**驗證**:
```bash
bun test packages/core/tests/body-cache.test.ts
```

---

### Phase 2: MinimalContext Query 快取 ⏳

**優先級**: P1
**預估工作量**: 1 天
**影響範圍**: MinimalContext

#### 2.1 問題分析

`queries()` 方法每次都重建 Record：
```typescript
// 現況
queries(): Record<string, string | string[]> {
  const params = this.getSearchParams()
  const result = {} // ← 每次都創建新物件
  for (const [key, value] of params.entries()) {
    // ...
  }
  return result
}
```

**開銷**: 每次呼叫都 O(n) 遍歷 + 新建物件

#### 2.2 實現方案

```typescript
// MinimalRequest
private _cachedQueries: Record<string, string | string[]> | null = null

queries(): Record<string, string | string[]> {
  if (this._cachedQueries === null) {
    const params = this.getSearchParams()
    const result = {}
    for (const [key, value] of params.entries()) {
      // ...
    }
    this._cachedQueries = result
  }
  return this._cachedQueries
}
```

- [ ] 在 MinimalRequest 添加 `_cachedQueries` 欄位
- [ ] 修改 `queries()` 實現快取邏輯
- [ ] MinimalContext.reset() 時清除快取
- [ ] 單元測試（快取驗證、多次呼叫）

**驗證**:
```bash
bun test packages/core/tests/minimal-context-query-cache.test.ts
```

---

### Phase 3: 基準測試驗證 ⏳

**優先級**: P1（在 Phase 1, 2 後執行）
**預估工作量**: 1 天

- [ ] 執行基準測試（Phases 1-2 後）
- [ ] 對比性能改進
- [ ] 記錄新基線數據
- [ ] 決策後續 Phase 優先級

**成功標準**:
- 基線數據驗證有正向收益
- 決定是否繼續 Phase 4+

---

### Phase 4: 中間件鏈預編譯 ⏳

**優先級**: P2
**預估工作量**: 2-3 天
**影響範圍**: Gravito.ts

#### 4.1 問題分析

每次請求都動態收集中間件：
```typescript
// 現況
const middlewares = await this.middlewareCollector.collect(path)
```

**開銷**: O(n) 遍歷中間件註冊列表

#### 4.2 實現方案

```typescript
// 編譯階段
private _middlewareCache = new Map<string, Handler[]>()

compileRoutes(): void {
  for (const path of this._registeredPaths) {
    const middlewares = this.middlewareCollector.collect(path)
    this._middlewareCache.set(path, middlewares)
  }
}

// 請求階段
const middlewares = this._middlewareCache.get(path) || []
```

- [ ] 設計中間件預編譯機制
- [ ] 實現 `compileMiddlewareChain()` 方法
- [ ] 整合到 `Gravito.compileRoutes()`
- [ ] 快取失效機制（新增/更新中間件）
- [ ] 單元測試（編譯、快取、失效）
- [ ] 集成測試（動態路由、多中間件）

**驗證**:
```bash
bun test packages/core/tests/middleware-precompile.test.ts
```

---

### Phase 5: AOTRouter 中間件快取深化 ⏳

**優先級**: P2
**預估工作量**: 2 天
**影響範圍**: AOTRouter.ts

#### 5.1 問題分析

`collectMiddleware()` 每次都比對 Pattern：
```typescript
// 現況
async collectMiddleware(path: string): Promise<Handler[]> {
  const result = []
  for (const route of this._routes) { // ← 每次都遍歷
    if (route.pattern.test(path)) {
      result.push(...route.middlewares)
    }
  }
  return result
}
```

#### 5.2 實現方案

LRU 快取：
```typescript
private _middlewareCache = new LRUCache<string, Handler[]>(1000)

async collectMiddleware(path: string): Promise<Handler[]> {
  if (this._middlewareCache.has(path)) {
    return this._middlewareCache.get(path)!
  }
  // ... 執行原有邏輯
  this._middlewareCache.set(path, result)
  return result
}
```

- [ ] 設計 LRU 快取機制（容量限制 1000）
- [ ] 實現快取邏輯
- [ ] 快取失效（新增/更新路由）
- [ ] 單元測試（LRU 快取、失效、容量限制）
- [ ] 性能測試（高路由數量下的記憶體曲線）

---

### Phase 6: Headers Object Spread 優化 ⏳

**優先級**: P2
**預估工作量**: 1 天
**影響範圍**: MinimalContext.ts

#### 6.1 問題分析

```typescript
// 現況（每次都淺複製）
getHeaders(contentType: string = 'application/json'): Record<string, string> {
  return { ...this._resHeaders, 'Content-Type': contentType }
}
```

**開銷**: O(n) 物件複製（n = headers 數量）

#### 6.2 實現方案

```typescript
getHeaders(contentType: string = 'application/json'): Record<string, string> {
  this._resHeaders['Content-Type'] = contentType
  return this._resHeaders
}

// 或使用臨時物件避免污染
getHeaders(contentType: string = 'application/json'): Record<string, string> {
  const temp = { ...this._resHeaders }
  temp['Content-Type'] = contentType
  return temp
}
```

- [ ] 分析影響範圍（是否會污染內部狀態）
- [ ] 選擇最優方案
- [ ] 實現優化
- [ ] 單元測試

---

### Phase 7: PhotonAdapter Proxy 消除 ⏳

**優先級**: P3
**預估工作量**: 3-5 天
**影響範圍**: PhotonAdapter.ts, PhotonContextWrapper

#### 7.1 問題分析

Proxy 無法被 JS 引擎優化，造成 15-25% 的性能損失

**現狀**: PhotonContextWrapper 使用 Proxy 代理屬性存取

#### 7.2 實現方案（方案 C: 物件池化）

- [ ] 設計 PhotonAdapterContextPool
- [ ] 修改 handler 轉換函數
- [ ] 測試 Hono API 相容性
- [ ] 性能基準測試

**參考**: `03-photon-adapter-proxy.md`

---

### Phase 8: FastContext Headers 池化 ⏳

**優先級**: P3
**預估工作量**: 1-2 天
**條件**: 需要先基準測試驗證假設

- [ ] 測試 Headers 創建開銷
- [ ] 如果收益 > 5%，實現池化機制
- [ ] 否則標記為「不優化」

---

### Phase 9: 微優化集合 ⏳

**優先級**: P4
**預估工作量**: 1-2 天

#### 9.1 Container Symbol Key
- [ ] 添加 Symbol 支援
- [ ] 更新文件推薦

#### 9.2 JSON 序列化快取（靜態響應）
- [ ] 預序列化靜態響應
- [ ] 應用於健康檢查等路由

#### 9.3 Request Body 快取（FastContext）
- [ ] 在 FastContext 添加 `_cachedJson` 和 `_jsonParsed`
- [ ] 在 reset() 時清除快取

---

## 工作流程指南

### 1. 開始優化前

```bash
# 確認當前代碼狀態
bun run typecheck
bun run build
bun test

# 確認無循環依賴
bun run scripts/generate-dependency-graph.ts
```

### 2. 執行每個 Phase

```bash
# Phase X 開始
# 1. 實現代碼
# 2. 運行測試
bun test

# 3. 運行基準測試
bun run bench

# 4. 對比性能改進
# 記錄數據到 benchmark-results/phase-X.json
```

### 3. 驗證無破壞性變更

```bash
# 類型檢查
bun run typecheck

# 全量構建
bun run build

# 完整測試
bun test
```

---

## 測試清單

### 行為一致性測試（必要）

- [ ] 中間件未呼叫 `next()` 且回傳 `Response`
- [ ] 中間件呼叫 `next()` 且回傳 `undefined`
- [ ] 多層中間件混合上述兩種情境
- [ ] 中間件 throw error 時，error handler 仍可正確處理
- [ ] 動態路由多次請求維持相同執行順序

### 快取正確性測試（必要）

- [ ] AOTRouter 快取鍵唯一性（不同路由不共享）
- [ ] compiledDynamicRoutes 快取（不同 pattern 不共享）
- [ ] Body/Query 快取清除機制
- [ ] 新增/更新中間件後快取失效

### 效能驗證（必要）

- [ ] Phase 1-2：Body/Query 快取效果驗證
- [ ] Phase 4-5：中間件預編譯及路由快取效果
- [ ] Phase 7-9：其他優化項效果驗證

### 安全與記憶體（建議）

- [ ] Pool 釋放（異常或中斷下是否安全釋放）
- [ ] 快取大小監控（高路由數量下的記憶體曲線）

---

## 成功標準

| 指標 | 當前基準 | 目標 | 驗證方法 |
|-----|---------|-----|---------|
| 空路由 RPS | ~150k | ~200k+ | oha benchmark |
| 3 中間件路由 RPS | ~80k | ~110k+ | oha benchmark |
| Context 創建時間 | ~2µs | ~100ns+ | mitata bench |
| 記憶體/請求 | ~8KB | ~4KB | heaptrack |
| p99 延遲 | ~1ms | ~0.5ms | oha benchmark |

---

## 追蹤與更新

**上次更新**: 2026-02-21
**更新者**: Code Review Phase 08
**下次檢查**: Phase 0 基準測試完成後

