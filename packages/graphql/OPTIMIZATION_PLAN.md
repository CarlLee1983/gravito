# @gravito/graphql 優化改進計劃

> 📅 建立日期：2026-01-25
> 📦 版本：1.1.0
> 🎯 目標版本：2.0.0

> **與 RFC 對齊說明**：本計劃為 [RFC.md](./RFC.md) 的詳細實作規劃。RFC 中的 Phase 2（Pothos 整合）納入 v1.2.0 規劃，Phase 3（Atlas 整合）將在後續版本中另行規劃。

## 📋 目錄

- [現況分析](#現況分析)
- [改進目標](#改進目標)
- [Phase 1：類型安全強化](#phase-1類型安全強化)
- [Phase 2：功能擴展](#phase-2功能擴展)
- [Phase 3：效能優化](#phase-3效能優化)
- [Phase 4：測試完善](#phase-4測試完善)
- [Phase 5：開發體驗提升](#phase-5開發體驗提升)
- [實作優先順序](#實作優先順序)
- [風險評估](#風險評估)

---

## 現況分析

### 架構概覽

目前 `@gravito/graphql` 基於 GraphQL Yoga 5 實作，提供以下功能：

- ✅ 零配置啟動（預設 Hello World Schema）
- ✅ 多種 Schema 解析方式（建構子 / Config / Container）
- ✅ Gravito Context 自動注入
- ✅ 自訂端點路徑
- ✅ GraphiQL 開發工具

### 程式碼品質評估

| 項目 | 現況 | 評分 |
|------|------|------|
| 類型安全 | 多處使用 `any` 類型 | ⭐⭐ |
| 測試覆蓋 | 基礎整合測試，缺少邊界測試 | ⭐⭐⭐ |
| 錯誤處理 | 僅基本錯誤回傳 | ⭐⭐ |
| 文檔完整度 | README 完整，JSDoc 基礎 | ⭐⭐⭐ |
| 擴展性 | 缺少 Plugin/Middleware 系統 | ⭐⭐ |

### 已知問題

1. **類型定義不完整**
   ```typescript
   // 現況：有意識地使用 any 類型（因 GraphQL Schema 類型複雜）
   // biome-ignore lint/suspicious/noExplicitAny: Generic Schema
   schema?: any
   private yoga: YogaServerInstance<any, any> | null = null
   ```

   > 注意：目前使用 `any` 是有意識的決定，但應透過泛型改善類型推導。

2. **缺少進階功能**
   - 無 Subscription (WebSocket) 支援
   - 無 Plugin 擴展機制
   - 無查詢複雜度限制
   - 無快取機制

3. **錯誤處理不完善**
   - Schema 解析失敗時無詳細錯誤訊息
   - 缺少自訂錯誤格式化

---

## 改進目標

### 核心目標

1. **類型安全**：消除所有 `any` 類型，提供完整類型推導
2. **功能完整**：支援生產環境所需的進階功能
3. **效能優異**：實現查詢快取、複雜度限制等優化
4. **測試健全**：達到 80%+ 測試覆蓋率
5. **開發友善**：完善文檔與錯誤提示

### 預期成果

- 類型覆蓋率 100%
- 測試覆蓋率 80%+
- 支援 Subscription
- 支援 Plugin 系統
- 支援查詢效能優化

---

## Phase 1：類型安全強化

### 1.1 Schema 類型定義

**目標**：為 GraphQL Schema 提供嚴格類型

```typescript
import type { GraphQLSchema } from 'graphql'
import type { YogaServerInstance, YogaInitialContext } from 'graphql-yoga'
import type { GravitoContext } from '@gravito/core'

/**
 * GraphQL 執行上下文，包含 Yoga 初始上下文與 Gravito 擴展。
 *
 * 注意：gravito 是透過 yoga.fetch() 第二參數注入，
 * 而非在 createYoga 的 context 函數中建立。
 */
export interface GraphQLContext extends YogaInitialContext {
  /** Gravito HTTP Context，可存取 req/res/服務等 */
  gravito: GravitoContext
}

/**
 * GraphQL Orbit 配置
 */
export interface GraphQLConfig {
  /** GraphQL Schema 實例 */
  schema?: GraphQLSchema
  /** 端點路徑 @default '/graphql' */
  path?: string
  /** 是否啟用 GraphiQL @default true */
  graphiql?: boolean
  /** CORS 配置 */
  cors?: CorsConfig
}
```

**實作注意事項**：

```typescript
// gravito context 透過 yoga.fetch() 第二參數注入
const response = await this.yoga.fetch(c.req.raw, {
  gravito: c, // <-- 這裡注入 Gravito Context
})

// createYoga 時需指定正確的泛型類型
this.yoga = createYoga<Record<string, unknown>, GraphQLContext>({
  schema,
  // context 函數可擴展額外屬性，但 gravito 來自 fetch 參數
  context: async (initialContext) => ({
    ...initialContext,
  }),
})
```

### 1.2 Yoga 實例類型

**目標**：為 Yoga 實例提供完整泛型定義

```typescript
export class OrbitGraphQL implements GravitoOrbit {
  private yoga: YogaServerInstance<Record<string, unknown>, GraphQLContext> | null = null
}
```

### 1.3 模組擴充完善

**目標**：擴充 `@gravito/core` 的類型定義

```typescript
declare module '@gravito/core' {
  interface GravitoVariables {
    graphql?: YogaServerInstance<Record<string, unknown>, GraphQLContext>
  }

  interface GravitoConfig {
    GRAPHQL_SCHEMA?: GraphQLSchema
  }
}
```

### 實作任務清單

- [x] 定義 `GraphQLContext` 介面
- [x] 移除所有 `any` 類型註解
- [x] 完善 `GraphQLConfig` 介面
- [x] 擴充 `@gravito/core` 模組類型
- [x] 新增 `biome.json` 規則禁止 `any`

---

## Phase 2：功能擴展

### 2.1 Subscription 支援 (WebSocket)

**目標**：支援 GraphQL Subscription 即時訂閱

```typescript
export interface GraphQLConfig {
  // ... 現有配置
  /** WebSocket 配置 */
  subscriptions?: {
    /** 是否啟用 @default false */
    enabled?: boolean
    /** WebSocket 路徑 @default '/graphql/ws' */
    path?: string
  }
}
```

**實作方向**：
- **優先使用 Bun 原生 WebSocket API**（比 graphql-ws 更高效）
- 備選：使用 Yoga 內建 SSE（Server-Sent Events）
- 提供 PubSub 機制整合

```typescript
// 使用 Bun 原生 WebSocket 實作 Subscription
Bun.serve({
  fetch: handler,
  websocket: {
    open: (ws) => {
      // 處理 GraphQL subscription 連線
    },
    message: (ws, message) => {
      // 處理 subscription 訊息
    },
    close: (ws) => {
      // 清理訂閱
    }
  }
})
```

### 2.2 Plugin 系統

**目標**：支援 GraphQL Yoga 插件擴展

```typescript
import { useDepthLimit } from '@graphql-yoga/plugin-depth-limit'

export interface GraphQLConfig {
  // ... 現有配置
  /** Yoga Plugins 陣列 */
  plugins?: YogaPlugin[]
}

// 使用範例
new OrbitGraphQL({
  plugins: [
    useDepthLimit({ maxDepth: 10 })
  ]
})
```

### 2.3 錯誤處理增強

**目標**：提供自訂錯誤格式化與處理

```typescript
export interface GraphQLConfig {
  /** 自訂錯誤格式化函數 */
  formatError?: (error: GraphQLError, context: GraphQLContext) => GraphQLFormattedError
  /** 是否在生產環境隱藏錯誤詳情 @default true */
  maskErrors?: boolean
}
```

### 2.4 CORS 配置

**目標**：支援跨域請求配置

```typescript
export interface CorsConfig {
  origin?: string | string[] | boolean
  credentials?: boolean
  methods?: string[]
  allowedHeaders?: string[]
}
```

### 2.5 驗證整合

**目標**：與 Gravito 驗證系統整合

```typescript
export interface GraphQLConfig {
  /** 是否要求驗證 @default false */
  requireAuth?: boolean
  /** 驗證失敗處理 */
  onAuthFailure?: (context: GraphQLContext) => Response | void
}
```

### 2.6 Bun 原生整合

**目標**：充分利用 Bun 運行環境的原生能力

> 依據 CLAUDE.md 指引，本專案應優先使用 Bun 原生 API。

**WebSocket Subscription**：
```typescript
// 使用 Bun 原生 WebSocket API，而非 graphql-ws
// 優點：更高效能、更小 bundle size、與 Gravito 生態一致
import { createPubSub } from 'graphql-yoga'

const pubsub = createPubSub()

// 整合至 Bun.serve() 的 websocket 選項
```

**快取整合**：
```typescript
// 考慮使用 Bun 原生 Redis 或 SQLite 實作查詢快取
import { Database } from 'bun:sqlite'

// 或使用 Bun.redis（若可用）
const redis = new Bun.RedisClient()
```

**Schema 檔案讀取**：
```typescript
// 使用 Bun.file 取代 node:fs
const schemaFile = Bun.file('./schema.graphql')
const schemaContent = await schemaFile.text()
```

### 實作任務清單

- [ ] 實作 Subscription 支援（優先 Bun WebSocket）
- [x] 實作 Plugin 系統傳遞
- [x] 實作自訂錯誤格式化
- [x] 實作 CORS 配置
- [x] 實作驗證整合
- [ ] 整合 Bun 原生 API
- [ ] 新增相關測試案例

---

## Phase 3：效能優化

### 3.1 查詢複雜度限制

**目標**：防止惡意深層查詢

```typescript
import { useDepthLimit } from '@graphql-yoga/plugin-depth-limit'

export interface GraphQLConfig {
  /** 查詢深度限制 @default 10 */
  maxDepth?: number
  /** 查詢複雜度限制 */
  maxComplexity?: number
}
```

### 3.2 查詢快取

**目標**：實現查詢結果快取

```typescript
export interface GraphQLConfig {
  /** 快取配置 */
  cache?: {
    /** 是否啟用 @default false */
    enabled?: boolean
    /** TTL 秒數 @default 60 */
    ttl?: number
    /** 快取 Key 生成函數 */
    keyGenerator?: (query: string, variables?: Record<string, unknown>) => string
  }
}
```

### 3.3 DataLoader 整合

**目標**：解決 N+1 查詢問題

```typescript
// 提供 DataLoader 工廠整合
export interface GraphQLConfig {
  /** DataLoader 配置 */
  dataLoaders?: Record<string, DataLoaderFactory>
}

// 在 Resolver 中使用
const users = await context.loaders.user.loadMany(ids)
```

### 3.4 查詢持久化

**目標**：支援 APQ (Automatic Persisted Queries)

```typescript
export interface GraphQLConfig {
  /** 持久化查詢配置 */
  persistedQueries?: {
    enabled?: boolean
    store?: PersistedQueryStore
  }
}
```

### 實作任務清單

- [ ] 整合查詢深度限制 Plugin
- [ ] 實作查詢複雜度計算
- [ ] 實作查詢快取機制
- [ ] 提供 DataLoader 整合範例
- [ ] 實作 APQ 支援
- [ ] 新增效能基準測試

---

## Phase 4：測試完善

### 4.1 單元測試擴充

**目標**：達到 80%+ 測試覆蓋率

```typescript
describe('OrbitGraphQL', () => {
  // 現有測試
  it('should be defined')
  it('should instantiate with config')

  // 新增測試
  it('should throw error when schema is invalid')
  it('should use default schema when none provided')
  it('should correctly resolve schema priority')
  it('should handle yoga initialization failure')
})
```

### 4.2 整合測試擴充

```typescript
describe('GraphQL Integration', () => {
  // 現有測試...

  // 新增測試
  it('should handle malformed queries')
  it('should handle validation errors')
  it('should respect depth limit')
  it('should handle authentication')
  it('should support subscriptions')
  it('should apply plugins correctly')
})
```

### 4.3 效能測試

```typescript
describe('GraphQL Performance', () => {
  it('should handle concurrent requests')
  it('should cache repeated queries')
  it('should respect rate limiting')
})
```

### 實作任務清單

- [ ] 新增 Schema 解析優先順序測試
- [ ] 新增錯誤處理測試
- [ ] 新增效能基準測試
- [ ] 新增邊界條件測試
- [ ] 確保覆蓋率達 80%+

---

## Phase 5：開發體驗提升

### 5.1 JSDoc 完善

**目標**：為所有公開 API 提供完整文檔

```typescript
/**
 * OrbitGraphQL 整合 GraphQL Yoga 至 Gravito 生態系統。
 * 提供無縫方式建構類型安全的 API，並自動將 Gravito Context 暴露給 Resolver。
 *
 * @example 基本使用
 * ```typescript
 * const graphql = new OrbitGraphQL({
 *   path: '/api/graphql',
 *   schema: mySchema
 * });
 * core.addOrbit(graphql);
 * ```
 *
 * @example 使用 Plugin
 * ```typescript
 * const graphql = new OrbitGraphQL({
 *   schema: mySchema,
 *   plugins: [useDepthLimit({ maxDepth: 10 })]
 * });
 * ```
 *
 * @see {@link GraphQLConfig} 配置選項
 * @see {@link https://the-guild.dev/graphql/yoga|GraphQL Yoga 文檔}
 * @public
 */
export class OrbitGraphQL implements GravitoOrbit { }
```

### 5.2 錯誤訊息改善

**目標**：提供清晰、可行動的錯誤訊息

```typescript
// 改善前
throw new Error('Schema not found')

// 改善後
throw new GraphQLConfigError(
  'Unable to resolve GraphQL schema. ' +
  'Please provide a schema via: ' +
  '(1) constructor config, ' +
  '(2) GRAPHQL_SCHEMA in config, or ' +
  '(3) container.instance("GRAPHQL_SCHEMA", schema).'
)
```

### 5.3 Code-First 整合 (Pothos)

**目標**：提供 Pothos Schema Builder 整合指南

```typescript
// 提供使用範例與最佳實踐
import SchemaBuilder from '@pothos/core'

const builder = new SchemaBuilder<{
  Context: GraphQLContext
}>({})

builder.queryType({
  fields: (t) => ({
    hello: t.string({ resolve: () => 'Hello!' })
  })
})

const schema = builder.toSchema()
```

### 5.4 CLI 工具

**目標**：提供 Schema 生成與驗證 CLI

```bash
# 驗證 Schema
bunx @gravito/graphql validate ./schema.graphql

# 生成類型定義
bunx @gravito/graphql codegen --output ./types.ts
```

### 實作任務清單

- [ ] 完善所有公開 API 的 JSDoc
- [ ] 建立自訂錯誤類別
- [ ] 撰寫 Pothos 整合指南
- [ ] 建立 CLI 工具（選配）
- [ ] 更新 README 與範例程式碼

---

## 實作優先順序

### 高優先（v1.1.0）

| 任務 | 複雜度 | 影響範圍 |
|------|--------|----------|
| 類型安全強化 | 中 | 核心 |
| Plugin 系統 | 低 | 擴展 |
| 查詢深度限制 | 低 | **安全性** |
| CORS 配置 | 低 | **生產環境** |
| 錯誤處理增強 | 低 | 穩定性 |
| 基礎測試補強 | 中 | 品質 |

### 中優先（v1.2.0）

| 任務 | 複雜度 | 影響範圍 |
|------|--------|----------|
| **Pothos 整合指南** | 中 | **RFC Phase 2** |
| JSDoc 完善 | 低 | 文檔 |
| 效能測試 | 中 | 品質 |
| Bun 原生整合 | 中 | 效能 |

### 低優先（v2.0.0）

| 任務 | 複雜度 | 影響範圍 |
|------|--------|----------|
| Subscription 支援 | 高 | 功能 |
| 查詢快取 | 高 | 效能 |
| DataLoader 整合 | 中 | 效能 |
| APQ 支援 | 中 | 效能 |

### 選配（v2.1.0+）

| 任務 | 複雜度 | 影響範圍 |
|------|--------|----------|
| CLI 工具 | 高 | 開發體驗（投入產出比低） |
| Atlas 整合 | 高 | RFC Phase 3 |

---

## 風險評估

### 技術風險

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|----------|
| 破壞性 API 變更 | 中 | 高 | 保持向後相容，使用 deprecation |
| Yoga 升級相容性 | 低 | 中 | 鎖定主版本，追蹤 changelog |
| 效能退化 | 低 | 高 | 建立基準測試，CI 監控 |

### 依賴風險

| 依賴 | 版本 | 風險 | 緩解措施 |
|------|------|------|----------|
| graphql-yoga | ^5.1.1 | 低 | 穩定版本，活躍維護 |
| graphql | ^16.8.1 | 低 | 核心規範，穩定 |

---

## 結論

本優化計劃涵蓋五大改進方向，預計分三個版本迭代完成。優先處理類型安全與測試覆蓋，確保核心品質；再逐步擴展進階功能，最終達成生產就緒的 GraphQL 整合方案。

### 里程碑

- **v1.1.0**：類型安全 + Plugin 系統 + 安全性（深度限制）+ CORS + 錯誤處理
- **v1.2.0**：Pothos 整合 + Bun 原生整合 + 文檔完善
- **v2.0.0**：Subscription + 快取 + DataLoader + APQ
- **v2.1.0+**：CLI 工具（選配）+ Atlas 整合（RFC Phase 3）

---

*本文件由 Claude Code 自動產生，建議定期審查並更新。*
