# @gravito/ion 優化改進計劃

> 📅 建立日期：2025-01-25
> 🔖 版本：v1.0.0
> 📦 目標包：`@gravito/ion` (Orbit Inertia)

---

## 📊 現況分析摘要

### 包概述

**Orbit Inertia** 是 Gravito 框架的 Inertia.js 官方適配器，用於構建現代單頁應用（SPA）。目前實現精簡高效，約 357 行源碼完成核心功能。

### 現有優勢

| 項目 | 評分 | 說明 |
|------|------|------|
| JSDoc 文檔 | ⭐⭐⭐⭐⭐ | 超詳細的文檔，包含 @example |
| 類型安全 | ⭐⭐⭐⭐⭐ | 完全 TypeScript，無 any 濫用 |
| 代碼簡潔性 | ⭐⭐⭐⭐⭐ | 357 行實現完整功能 |
| 不可變性 | ⭐⭐⭐⭐⭐ | 使用展開語法，無副作用 |
| 錯誤處理 | ⭐⭐⭐⭐ | try-catch 包裹，有回退方案 |

### 待改進領域

1. **測試覆蓋不完整** - 缺少邊界情況測試
2. **錯誤分類不細緻** - 統一的錯誤處理不便於診斷
3. **日誌記錄不一致** - 缺少請求級別日誌
4. **無深度驗證** - 不驗證 props 序列化可行性

---

## 🎯 優化目標

### 主要目標

1. **測試覆蓋率提升至 90%+**
2. **增強錯誤診斷與日誌記錄**
3. **提供更好的 TypeScript 泛型支援**
4. **優化 props 處理性能**

### 非目標（超出範圍）

- 重構核心架構（現有架構已足夠穩健）
- 增加新的協議支持
- 與其他框架的整合

---

## 📋 優化階段

### 第一階段：測試強化 (Priority: High) ✅

**目標：** 將測試覆蓋率從當前水平提升至 90%+

#### 任務清單

- [x] **1.1** 新增 `rootVars` 參數傳遞測試
- [x] **1.2** 新增 HTTP status codes 測試 (201, 400, 500 等)
- [x] **1.3** 新增 URL 解析邊界情況測試
- [x] **1.4** 新增 props 特殊字符處理測試
- [x] **1.5** 新增 undefined/null props 處理測試
- [x] **1.6** 新增 Lazy Props（函數型 props）測試
- [x] **1.7** 新增 HTML 轉義邏輯完整性測試

#### 新增測試用例示例

```typescript
// tests/index.test.ts 新增

describe('InertiaService - 邊界情況', () => {
  it('應正確處理 rootVars 參數', async () => {
    const res = await app.request('/test-rootvars')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('customRootVar')
  })

  it('應正確傳遞自定義 HTTP status code', async () => {
    const res = await app.request('/test-created')
    expect(res.status).toBe(201)
  })

  it('應正確處理包含特殊字符的 props', async () => {
    const res = await app.request('/test-special-chars')
    const html = await res.text()
    expect(html).not.toContain('<script>')
  })

  it('應正確執行 Lazy Props 函數', async () => {
    const res = await app.request('/test-lazy-props')
    const json = await res.json()
    expect(json.props.computed).toBeDefined()
  })
})
```

---

### 第二階段：錯誤處理增強 (Priority: High)

**目標：** 提供更細緻的錯誤分類與診斷信息

#### 任務清單

- [ ] **2.1** 定義自定義錯誤類型層級
- [ ] **2.2** 區分配置錯誤、數據錯誤、模板錯誤
- [ ] **2.3** 提供錯誤恢復建議訊息
- [ ] **2.4** 增強開發模式下的錯誤堆棧追蹤

#### 錯誤類型定義

```typescript
// src/errors.ts

/**
 * Inertia 基礎錯誤類
 */
export class InertiaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'InertiaError'
  }
}

/**
 * 配置錯誤 - ViewService 未注入等
 */
export class InertiaConfigError extends InertiaError {
  constructor(message: string, cause?: unknown) {
    super(message, 'INERTIA_CONFIG_ERROR', cause)
    this.name = 'InertiaConfigError'
  }
}

/**
 * 序列化錯誤 - Props 無法序列化為 JSON
 */
export class InertiaSerializationError extends InertiaError {
  constructor(message: string, cause?: unknown) {
    super(message, 'INERTIA_SERIALIZATION_ERROR', cause)
    this.name = 'InertiaSerializationError'
  }
}

/**
 * 模板錯誤 - 視圖模板渲染失敗
 */
export class InertiaTemplateError extends InertiaError {
  constructor(message: string, cause?: unknown) {
    super(message, 'INERTIA_TEMPLATE_ERROR', cause)
    this.name = 'InertiaTemplateError'
  }
}
```

#### 錯誤處理改進示例

```typescript
// src/InertiaService.ts 改進

render(component: string, props?: Record<string, unknown>, ...): Response {
  const view = this.context.get('view') as ViewService | undefined

  if (!view) {
    throw new InertiaConfigError(
      'ViewService 未注入。請確保在 OrbitIon 之前載入 OrbitPrism。',
      { hint: "core.addOrbit(new OrbitPrism({ viewPath: 'src/views' }))" }
    )
  }

  try {
    const pageJson = JSON.stringify(page)
    // ...
  } catch (error) {
    throw new InertiaSerializationError(
      `無法序列化 props 為 JSON。組件: ${component}`,
      error
    )
  }
}
```

---

### 第三階段：TypeScript 泛型支援 (Priority: Medium)

**目標：** 提供類型安全的 props 傳遞

#### 任務清單

- [ ] **3.1** 為 `render()` 方法增加泛型參數
- [ ] **3.2** 創建組件 props 類型推斷輔助工具
- [ ] **3.3** 更新文檔說明泛型使用方式

#### 泛型實現示例

```typescript
// src/InertiaService.ts

/**
 * 渲染 Inertia 組件
 * @template T - Props 類型
 */
render<T extends Record<string, unknown> = Record<string, unknown>>(
  component: string,
  props?: T,
  rootVars?: Record<string, unknown>,
  status?: number
): Response {
  // 實現保持不變
}

// 使用示例
interface UserIndexProps {
  users: User[]
  pagination: {
    page: number
    total: number
  }
}

// 現在有完整的類型提示
inertia.render<UserIndexProps>('Users/Index', {
  users: [],        // ✅ 類型安全
  pagination: {
    page: 1,
    total: 100
  }
})
```

---

### 第四階段：日誌與可觀測性 (Priority: Medium)

**目標：** 提供一致的日誌記錄與性能監控

#### 任務清單

- [ ] **4.1** 實現結構化日誌記錄
- [ ] **4.2** 增加請求級別日誌（render 調用）
- [ ] **4.3** 提供可選的性能監控鉤子
- [ ] **4.4** 支持日誌級別配置

#### 日誌配置示例

```typescript
// src/types.ts

export interface InertiaConfig {
  rootView?: string
  version?: string

  /** 日誌級別：'debug' | 'info' | 'warn' | 'error' | 'silent' */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent'

  /** 性能監控回調 */
  onRender?: (metrics: RenderMetrics) => void
}

export interface RenderMetrics {
  component: string
  propsSize: number
  duration: number
  isPartialReload: boolean
}
```

#### 日誌實現示例

```typescript
// src/InertiaService.ts

render(...): Response {
  const startTime = performance.now()

  this.log('debug', 'inertia:render:start', {
    component,
    propsKeys: props ? Object.keys(props) : [],
    isPartialReload: !!this.context.req.header('X-Inertia'),
  })

  // ... 渲染邏輯 ...

  const duration = performance.now() - startTime

  this.log('debug', 'inertia:render:complete', {
    component,
    duration: `${duration.toFixed(2)}ms`,
  })

  // 觸發性能監控回調
  this.config.onRender?.({
    component,
    propsSize: JSON.stringify(props).length,
    duration,
    isPartialReload,
  })

  return response
}
```

---

### 第五階段：性能優化 (Priority: Low) ✅

**目標：** 優化高頻場景下的性能

#### 任務清單

- [x] **5.1** 實現 shared props 緩存機制
- [x] **5.2** 優化 HTML 轉義函數性能
- [x] **5.3** 考慮 props 序列化結果緩存

#### 緩存實現示例

```typescript
// src/InertiaService.ts

private sharedPropsCache: Map<string, string> = new Map()

private getCachedSharedProps(): string {
  const key = JSON.stringify(this.sharedProps)

  if (!this.sharedPropsCache.has(key)) {
    this.sharedPropsCache.set(key, key)
  }

  return this.sharedPropsCache.get(key)!
}
```

---

## 📅 執行時程建議

| 階段 | 預估工作量 | 依賴 |
|------|-----------|------|
| 第一階段：測試強化 | 中 | 無 |
| 第二階段：錯誤處理 | 中 | 無 |
| 第三階段：泛型支援 | 小 | 無 |
| 第四階段：日誌系統 | 中 | 無 |
| 第五階段：性能優化 | 小 | 第四階段 |

---

## 📝 驗收標準

### 第一階段完成標準

- [x] 測試覆蓋率達到 90%+
- [x] 所有邊界情況有對應測試
- [x] CI 流水線通過

### 第二階段完成標準

- [ ] 自定義錯誤類型實現完成
- [ ] 錯誤訊息包含恢復建議
- [ ] 更新文檔說明錯誤處理

### 第三階段完成標準

- [ ] 泛型 API 實現完成
- [ ] 類型推斷正常運作
- [ ] 更新文檔與示例

### 第四階段完成標準

- [ ] 結構化日誌實現完成
- [ ] 性能監控鉤子可用
- [ ] 日誌級別可配置

### 第五階段完成標準

- [x] 緩存機制實現完成
- [x] 性能基準測試通過
- [x] 無記憶體洩漏

---

## 🔗 相關資源

- [Inertia.js 官方文檔](https://inertiajs.com/)
- [Gravito 框架文檔](../README.md)
- [@gravito/prism 文檔](../../prism/README.md)

---

## 📌 備註

此優化計劃基於當前 `@gravito/ion` v0.0.1 版本分析。各階段可依實際需求調整優先順序，建議從第一階段（測試強化）開始，確保後續改動有充分的測試保護。
