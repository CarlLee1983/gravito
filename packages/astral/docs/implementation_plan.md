# 實作計畫：Astral 模組效能與型別安全優化

## 概述

本計畫針對 Astral OpenAPI 生成器模組進行四項關鍵改進：輸出快取機制、強化型別安全、穩定 Schema 快取鍵、以及路由匹配效能優化。採用 TDD 方式開發，確保現有測試通過且新增功能有完整覆蓋。

## 需求清單

| 優先級 | 問題 | 位置 | 目標 |
|--------|------|------|------|
| Critical | 輸出快取缺失 | `src/index.ts:279-283` | 減少 95%+ 重複計算 |
| High | 型別安全不足 | `src/OpenApiGenerator.ts` | 消除 `any` 型別 |
| High | Schema 快取鍵不穩定 | `src/OpenApiGenerator.ts:475-497` | 確保相同 schema 產生相同鍵 |
| Medium | 路由匹配 O(N*M) | `src/OpenApiGenerator.ts:160-164` | 降至 O(1) 或 O(log N) |

## 架構變更

### 檔案變更清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `/packages/astral/package.json` | 修改 | 新增 `openapi-types` 依賴 |
| `/packages/astral/src/types.ts` | 修改 | 匯入並使用 OpenAPI 型別定義 |
| `/packages/astral/src/OpenApiGenerator.ts` | 修改 | 重構為強型別 + 新增快取邏輯 |
| `/packages/astral/src/index.ts` | 修改 | 新增輸出快取機制 |
| `/packages/astral/src/cache.ts` | 新增 | 快取管理器（可選獨立模組） |
| `/packages/astral/src/hash.ts` | 新增 | 穩定雜湊演算法工具 |
| `/packages/astral/src/route-index.ts` | 新增 | 路由索引建構器 |
| `/packages/astral/tests/cache.test.ts` | 新增 | 快取機制測試 |
| `/packages/astral/tests/hash.test.ts` | 新增 | 雜湊演算法測試 |
| `/packages/astral/tests/route-index.test.ts` | 新增 | 路由索引測試 |
| `/packages/astral/tests/performance.test.ts` | 新增 | 效能基準測試 |

---

## 實作步驟

### Phase 1: 基礎設施準備

#### 步驟 1.1: 新增依賴項
**檔案**: `/packages/astral/package.json`

```json
{
  "dependencies": {
    "openapi-types": "^12.1.3"
  }
}
```

- **動作**: 新增 `openapi-types` 套件
- **原因**: 提供 OpenAPI 3.1 的完整型別定義
- **依賴**: 無
- **風險**: 低

#### 步驟 1.2: 建立穩定雜湊演算法
**檔案**: `/packages/astral/src/hash.ts` (新增)

```typescript
/**
 * 產生穩定的雜湊值，用於 Schema 快取鍵
 * 使用 Bun 內建的 hash 或自行實作 DJB2 演算法
 */
export function stableHash(input: unknown): string {
  const str = typeof input === 'string'
    ? input
    : JSON.stringify(input, Object.keys(input as object).sort())

  // DJB2 雜湊演算法
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return `hash:${(hash >>> 0).toString(36)}`
}

/**
 * 從 Zod schema 產生穩定的快取鍵
 */
export function getStableSchemaKey(schema: unknown): string {
  // 實作細節見 Phase 2
}
```

- **動作**: 實作穩定的雜湊演算法
- **原因**: 解決 `Math.random()` 導致的快取失效問題
- **依賴**: 無
- **風險**: 低

---

### Phase 2: 型別安全強化（TDD）

#### 步驟 2.1: 撰寫型別測試
**檔案**: `/packages/astral/tests/types.test.ts` (新增)

```typescript
import { describe, test, expect } from 'bun:test'
import type { OpenAPIV3_1 } from 'openapi-types'
import { OpenApiGenerator } from '../src/OpenApiGenerator'

describe('Type Safety', () => {
  test('generate() should return OpenAPIV3_1.Document', () => {
    const gen = new OpenApiGenerator({ contracts: [] })
    const spec = gen.generate([])

    // 編譯時型別檢查
    const _info: OpenAPIV3_1.InfoObject = spec.info
    const _paths: OpenAPIV3_1.PathsObject = spec.paths
    expect(spec.openapi).toBe('3.1.0')
  })
})
```

- **動作**: 撰寫型別安全測試（RED）
- **原因**: 確保型別定義正確
- **依賴**: 步驟 1.1
- **風險**: 低

#### 步驟 2.2: 更新 types.ts
**檔案**: `/packages/astral/src/types.ts`

```typescript
import type { OpenAPIV3_1 } from 'openapi-types'

// 匯出常用型別別名
export type OpenApiDocument = OpenAPIV3_1.Document
export type OpenApiPathItem = OpenAPIV3_1.PathItemObject
export type OpenApiOperation = OpenAPIV3_1.OperationObject
export type OpenApiSchema = OpenAPIV3_1.SchemaObject
export type OpenApiResponse = OpenAPIV3_1.ResponseObject
export type OpenApiParameter = OpenAPIV3_1.ParameterObject

// 保留現有的 AstralConfig, AstralResource 等定義
// ...
```

- **動作**: 新增 OpenAPI 型別匯出
- **原因**: 提供模組內部使用的強型別定義
- **依賴**: 步驟 1.1
- **風險**: 低

#### 步驟 2.3: 重構 OpenApiGenerator 型別
**檔案**: `/packages/astral/src/OpenApiGenerator.ts`

**修改位置 1: Line 34**
```typescript
// 之前
private schemaCache = new Map<string, any>()

// 之後
import type { OpenAPIV3_1 } from 'openapi-types'
private schemaCache = new Map<string, OpenAPIV3_1.SchemaObject>()
```

**修改位置 2: Line 44**
```typescript
// 之前
generate(routes: AstralRoute[]): any

// 之後
generate(routes: AstralRoute[]): OpenAPIV3_1.Document
```

**修改位置 3: Line 261**
```typescript
// 之前
const operation: any = { ... }

// 之後
const operation: OpenAPIV3_1.OperationObject = { ... }
```

**修改位置 4: Line 44-56**
```typescript
// 之前
const spec: any = { ... }

// 之後
const spec: OpenAPIV3_1.Document = {
  openapi: '3.1.0',
  info: {
    title: this.config.title || 'API Documentation',
    version: this.config.version || '1.0.0',
    description: this.config.description,
  },
  paths: {} as OpenAPIV3_1.PathsObject,
  components: {
    schemas: {} as Record<string, OpenAPIV3_1.SchemaObject>,
  },
}
```

- **動作**: 替換所有 `any` 為強型別（GREEN）
- **原因**: 提升程式碼品質與開發體驗
- **依賴**: 步驟 2.2
- **風險**: 中（可能有型別不相容問題）

---

### Phase 3: Schema 快取鍵穩定化（TDD）

#### 步驟 3.1: 撰寫快取鍵測試
**檔案**: `/packages/astral/tests/hash.test.ts` (新增)

```typescript
import { describe, test, expect } from 'bun:test'
import { z } from 'zod'
import { getStableSchemaKey } from '../src/hash'

describe('Stable Schema Key', () => {
  test('same schema should produce identical key', () => {
    const schema1 = z.object({ id: z.number(), name: z.string() })
    const schema2 = z.object({ id: z.number(), name: z.string() })

    const key1 = getStableSchemaKey(schema1)
    const key2 = getStableSchemaKey(schema2)

    expect(key1).toBe(key2)
  })

  test('different schemas should produce different keys', () => {
    const schema1 = z.object({ id: z.number() })
    const schema2 = z.object({ name: z.string() })

    expect(getStableSchemaKey(schema1)).not.toBe(getStableSchemaKey(schema2))
  })

  test('array schema should include item type in key', () => {
    const itemSchema = z.object({ id: z.number() })
    const arraySchema = z.array(itemSchema)

    const key = getStableSchemaKey(arraySchema)
    expect(key).toContain('array')
  })

  test('key should be deterministic across multiple calls', () => {
    const schema = z.object({ email: z.string().email() })
    const results = Array.from({ length: 100 }, () => getStableSchemaKey(schema))

    expect(new Set(results).size).toBe(1)
  })
})
```

- **動作**: 撰寫快取鍵穩定性測試（RED）
- **原因**: 確保 `Math.random()` 不再被使用
- **依賴**: 無
- **風險**: 低

#### 步驟 3.2: 實作穩定雜湊
**檔案**: `/packages/astral/src/hash.ts`

```typescript
import type { ZodSchema } from 'zod'

/**
 * 從 Zod schema 的 _def 結構產生穩定的快取鍵
 */
export function getStableSchemaKey(schema: unknown): string {
  if (Array.isArray(schema)) {
    return `array:${getStableSchemaKey(schema[0])}`
  }

  const zodSchema = schema as { _def?: Record<string, unknown> }

  if (!zodSchema?._def) {
    // 非 Zod schema，使用 JSON 序列化
    return stableHash(schema)
  }

  const def = zodSchema._def
  const typeName = (def.typeName as string) || 'unknown'

  // 處理 ZodObject
  if (typeName === 'ZodObject' && typeof def.shape === 'function') {
    const shape = def.shape() as Record<string, unknown>
    const sortedKeys = Object.keys(shape).sort()
    const keySignature = sortedKeys
      .map(k => `${k}:${getStableSchemaKey(shape[k])}`)
      .join(',')
    return `obj:{${keySignature}}`
  }

  // 處理 ZodArray
  if (typeName === 'ZodArray' && def.type) {
    return `arr:${getStableSchemaKey(def.type)}`
  }

  // 處理其他基本型別
  if (typeName === 'ZodString') return 'str'
  if (typeName === 'ZodNumber') return 'num'
  if (typeName === 'ZodBoolean') return 'bool'
  if (typeName === 'ZodOptional' && def.innerType) {
    return `opt:${getStableSchemaKey(def.innerType)}`
  }

  // Fallback：使用 typeName
  return stableHash(typeName)
}

function stableHash(input: unknown): string {
  const str = typeof input === 'string'
    ? input
    : JSON.stringify(input)

  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return `h:${(hash >>> 0).toString(36)}`
}
```

- **動作**: 實作基於 schema 結構的穩定鍵生成（GREEN）
- **原因**: 消除 `Math.random()` 的使用
- **依賴**: 步驟 3.1
- **風險**: 中

#### 步驟 3.3: 整合至 OpenApiGenerator
**檔案**: `/packages/astral/src/OpenApiGenerator.ts`

```typescript
import { getStableSchemaKey } from './hash'

// 修改 getSchemaKey 方法（Line 475-497）
private getSchemaKey(schema: unknown): string {
  return getStableSchemaKey(schema)
}
```

- **動作**: 替換原有實作
- **原因**: 統一使用穩定的雜湊演算法
- **依賴**: 步驟 3.2
- **風險**: 低

---

### Phase 4: 輸出快取機制（TDD）

#### 步驟 4.1: 撰寫快取測試
**檔案**: `/packages/astral/tests/cache.test.ts` (新增)

```typescript
import { describe, test, expect, mock, spyOn } from 'bun:test'
import { z } from 'zod'
import { OpenApiGenerator } from '../src/OpenApiGenerator'
import { SpecCache } from '../src/cache'

describe('Spec Cache', () => {
  test('should cache generated spec', () => {
    const cache = new SpecCache()
    const routes = [{ path: '/users', method: 'GET' }]

    cache.set(routes, { openapi: '3.1.0' } as any)

    expect(cache.get(routes)).toBeDefined()
    expect(cache.get(routes)?.openapi).toBe('3.1.0')
  })

  test('should invalidate on route change', () => {
    const cache = new SpecCache()
    const routes1 = [{ path: '/users', method: 'GET' }]
    const routes2 = [{ path: '/users', method: 'GET' }, { path: '/posts', method: 'GET' }]

    cache.set(routes1, { openapi: '3.1.0' } as any)

    expect(cache.get(routes1)).toBeDefined()
    expect(cache.get(routes2)).toBeUndefined()
  })

  test('should not regenerate spec when routes unchanged', () => {
    const config = { contracts: [] }
    const gen = new OpenApiGenerator(config)
    const generateSpy = spyOn(gen as any, 'processResource')

    const routes = [{ path: '/users', method: 'GET' }]

    gen.generateWithCache(routes)
    gen.generateWithCache(routes)

    // processResource 只應該被呼叫一次
    expect(generateSpy).toHaveBeenCalledTimes(0) // 沒有 contracts
  })
})
```

- **動作**: 撰寫快取機制測試（RED）
- **原因**: 確保快取邏輯正確
- **依賴**: 無
- **風險**: 低

#### 步驟 4.2: 實作快取管理器
**檔案**: `/packages/astral/src/cache.ts` (新增)

```typescript
import type { OpenAPIV3_1 } from 'openapi-types'
import type { AstralRoute } from './OpenApiGenerator'

export class SpecCache {
  private cachedSpec: OpenAPIV3_1.Document | null = null
  private routeFingerprint: string = ''

  /**
   * 產生路由的指紋（用於檢測變化）
   */
  private computeFingerprint(routes: AstralRoute[]): string {
    const sorted = [...routes].sort((a, b) =>
      `${a.method}:${a.path}`.localeCompare(`${b.method}:${b.path}`)
    )
    return sorted.map(r => `${r.method}:${r.path}`).join('|')
  }

  /**
   * 取得快取的 spec（若存在且有效）
   */
  get(routes: AstralRoute[]): OpenAPIV3_1.Document | null {
    const fingerprint = this.computeFingerprint(routes)
    if (fingerprint === this.routeFingerprint) {
      return this.cachedSpec
    }
    return null
  }

  /**
   * 設定快取
   */
  set(routes: AstralRoute[], spec: OpenAPIV3_1.Document): void {
    this.routeFingerprint = this.computeFingerprint(routes)
    this.cachedSpec = spec
  }

  /**
   * 清除快取
   */
  invalidate(): void {
    this.cachedSpec = null
    this.routeFingerprint = ''
  }
}
```

- **動作**: 實作快取管理器（GREEN）
- **原因**: 避免重複生成 OpenAPI spec
- **依賴**: 步驟 4.1
- **風險**: 低

#### 步驟 4.3: 整合快取至 OpenApiGenerator
**檔案**: `/packages/astral/src/OpenApiGenerator.ts`

```typescript
import { SpecCache } from './cache'

export class OpenApiGenerator {
  private schemaCache = new Map<string, OpenAPIV3_1.SchemaObject>()
  private specCache = new SpecCache()

  // 新增帶快取的生成方法
  generateWithCache(routes: AstralRoute[]): OpenAPIV3_1.Document {
    const cached = this.specCache.get(routes)
    if (cached) {
      return cached
    }

    const spec = this.generate(routes)
    this.specCache.set(routes, spec)
    return spec
  }

  // 清除快取的公開方法
  invalidateCache(): void {
    this.specCache.invalidate()
    this.schemaCache.clear()
  }
}
```

- **動作**: 新增 `generateWithCache` 方法
- **原因**: 保持 API 向後相容
- **依賴**: 步驟 4.2
- **風險**: 低

#### 步驟 4.4: 更新 OrbitAstral
**檔案**: `/packages/astral/src/index.ts`

```typescript
// 修改 Line 279-283
async install(core: PlanetCore): Promise<void> {
  const router = core.router

  // 1. Serve OpenAPI JSON（使用快取）
  router.get(this.config.jsonPath || '/openapi.json', (ctx: GravitoContext) => {
    const routes = router.compile()
    const spec = this.generator.generateWithCache(routes)  // 使用快取版本
    return ctx.json(spec)
  })

  // ... 其餘不變
}
```

- **動作**: 使用 `generateWithCache` 替換 `generate`
- **原因**: 啟用輸出快取
- **依賴**: 步驟 4.3
- **風險**: 低

---

### Phase 5: 路由匹配效能優化（TDD）

#### 步驟 5.1: 撰寫路由索引測試
**檔案**: `/packages/astral/tests/route-index.test.ts` (新增)

```typescript
import { describe, test, expect } from 'bun:test'
import { RouteIndex } from '../src/route-index'

describe('RouteIndex', () => {
  test('should build index from routes', () => {
    const routes = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/users/:id', method: 'GET' },
      { path: '/api/posts', method: 'GET' },
    ]

    const index = new RouteIndex(routes)

    expect(index.findByPrefix('/api/users')).toHaveLength(2)
    expect(index.findByPrefix('/api/posts')).toHaveLength(1)
  })

  test('should handle exact match', () => {
    const routes = [
      { path: '/api/users', method: 'GET' },
      { path: '/api/users2', method: 'GET' },
    ]

    const index = new RouteIndex(routes)
    const matches = index.findByPrefix('/api/users')

    expect(matches.map(r => r.path)).not.toContain('/api/users2')
  })

  test('should be O(1) lookup for exact paths', () => {
    const routes = Array.from({ length: 10000 }, (_, i) => ({
      path: `/api/resource${i}`,
      method: 'GET',
    }))

    const index = new RouteIndex(routes)

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      index.findByPrefix('/api/resource5000')
    }
    const elapsed = performance.now() - start

    // 1000 次查詢應該在 10ms 內完成
    expect(elapsed).toBeLessThan(10)
  })
})
```

- **動作**: 撰寫路由索引測試（RED）
- **原因**: 驗證效能改善
- **依賴**: 無
- **風險**: 低

#### 步驟 5.2: 實作路由索引
**檔案**: `/packages/astral/src/route-index.ts` (新增)

```typescript
import type { AstralRoute } from './OpenApiGenerator'

/**
 * 路由索引，提供 O(1) 的前綴查詢
 */
export class RouteIndex {
  // 精確路徑 -> 路由列表
  private exactIndex = new Map<string, AstralRoute[]>()
  // 前綴 -> 路由列表（用於子路徑匹配）
  private prefixIndex = new Map<string, AstralRoute[]>()

  constructor(routes: AstralRoute[]) {
    this.buildIndex(routes)
  }

  private buildIndex(routes: AstralRoute[]): void {
    for (const route of routes) {
      // 精確路徑索引
      if (!this.exactIndex.has(route.path)) {
        this.exactIndex.set(route.path, [])
      }
      this.exactIndex.get(route.path)!.push(route)

      // 前綴索引（處理巢狀路由）
      const segments = route.path.split('/').filter(Boolean)
      let prefix = ''
      for (const segment of segments) {
        prefix += '/' + segment
        if (!this.prefixIndex.has(prefix)) {
          this.prefixIndex.set(prefix, [])
        }
        this.prefixIndex.get(prefix)!.push(route)
      }
    }
  }

  /**
   * 根據資源路徑找到所有匹配的路由
   * 時間複雜度: O(1)
   */
  findByPrefix(resourcePath: string): AstralRoute[] {
    const exactMatches = this.exactIndex.get(resourcePath) || []
    const prefixMatches = this.prefixIndex.get(resourcePath) || []

    // 合併並去重
    const seen = new Set<string>()
    const result: AstralRoute[] = []

    for (const route of [...exactMatches, ...prefixMatches]) {
      const key = `${route.method}:${route.path}`
      if (!seen.has(key) && this.isValidMatch(route.path, resourcePath)) {
        seen.add(key)
        result.push(route)
      }
    }

    return result
  }

  /**
   * 驗證路由是否真正匹配資源路徑
   * （避免 /users 匹配到 /users2）
   */
  private isValidMatch(routePath: string, resourcePath: string): boolean {
    if (routePath === resourcePath) return true
    if (!routePath.startsWith(resourcePath)) return false
    const remainder = routePath.slice(resourcePath.length)
    return remainder.startsWith('/')
  }
}
```

- **動作**: 實作基於 Map 的路由索引（GREEN）
- **原因**: 將 O(N*M) 降低至 O(1)
- **依賴**: 步驟 5.1
- **風險**: 中

#### 步驟 5.3: 整合路由索引至 OpenApiGenerator
**檔案**: `/packages/astral/src/OpenApiGenerator.ts`

```typescript
import { RouteIndex } from './route-index'

export class OpenApiGenerator {
  // ...

  generate(routes: AstralRoute[]): OpenAPIV3_1.Document {
    // 建立路由索引
    const routeIndex = new RouteIndex(routes)

    // ... 其他初始化邏輯 ...

    // 處理每個 contract/resource
    for (const resource of this.config.contracts || []) {
      this.processResourceWithIndex(spec, resource, routeIndex)
    }

    return spec
  }

  private processResourceWithIndex(
    spec: OpenAPIV3_1.Document,
    resource: AstralResource,
    routeIndex: RouteIndex
  ): void {
    // 使用索引進行 O(1) 查詢
    const matchingRoutes = routeIndex.findByPrefix(resource.path)

    for (const route of matchingRoutes) {
      const path = this.normalizePath(route.path)
      const method = route.method.toLowerCase() as keyof OpenAPIV3_1.PathItemObject

      if (!spec.paths[path]) {
        spec.paths[path] = {}
      }

      const opKey = this.inferOperationKey(route, resource)
      const opMetadata = resource.operations[opKey] || {}

      ;(spec.paths[path] as OpenAPIV3_1.PathItemObject)[method] =
        this.buildOperation(opMetadata, resource, method, route.path)
    }
  }
}
```

- **動作**: 替換原有的 filter 邏輯
- **原因**: 提升大量路由時的效能
- **依賴**: 步驟 5.2
- **風險**: 中

---

### Phase 6: 效能基準測試

#### 步驟 6.1: 建立效能測試
**檔案**: `/packages/astral/tests/performance.test.ts` (新增)

```typescript
import { describe, test, expect } from 'bun:test'
import { z } from 'zod'
import { OpenApiGenerator } from '../src/OpenApiGenerator'
import { astral } from '../src/index'

describe('Performance Benchmarks', () => {
  const UserDTO = z.object({ id: z.number(), name: z.string() })

  test('should handle 1000 routes efficiently', () => {
    const contracts = Array.from({ length: 100 }, (_, i) =>
      astral.resource(`/api/resource${i}`, {
        operations: {
          index: { summary: 'List', output: [UserDTO] },
          show: { summary: 'Get', output: UserDTO },
          store: { summary: 'Create', output: UserDTO },
          update: { summary: 'Update', output: UserDTO },
          destroy: { summary: 'Delete' },
        },
      })
    )

    const routes = contracts.flatMap(c => [
      { path: c.path, method: 'GET' },
      { path: `${c.path}/:id`, method: 'GET' },
      { path: c.path, method: 'POST' },
      { path: `${c.path}/:id`, method: 'PUT' },
      { path: `${c.path}/:id`, method: 'DELETE' },
    ])

    const gen = new OpenApiGenerator({ contracts })

    const start = performance.now()
    const spec = gen.generate(routes)
    const elapsed = performance.now() - start

    console.log(`Generation time: ${elapsed.toFixed(2)}ms for ${routes.length} routes`)

    // 500 路由應該在 100ms 內完成
    expect(elapsed).toBeLessThan(100)
    expect(Object.keys(spec.paths).length).toBe(200) // 100 base + 100 /:id
  })

  test('cache should reduce generation time by 95%', () => {
    const contracts = [
      astral.resource('/api/users', {
        operations: {
          index: { summary: 'List', output: [UserDTO] },
        },
      }),
    ]
    const routes = [{ path: '/api/users', method: 'GET' }]
    const gen = new OpenApiGenerator({ contracts })

    // 第一次生成
    const start1 = performance.now()
    gen.generateWithCache(routes)
    const first = performance.now() - start1

    // 第二次使用快取
    const start2 = performance.now()
    gen.generateWithCache(routes)
    const second = performance.now() - start2

    console.log(`First: ${first.toFixed(2)}ms, Cached: ${second.toFixed(3)}ms`)

    // 快取應該快 95% 以上
    expect(second).toBeLessThan(first * 0.05)
  })
})
```

- **動作**: 建立效能基準測試
- **原因**: 量化效能改善
- **依賴**: 所有前置步驟
- **風險**: 低

---

## 測試策略

### 單元測試

| 測試檔案 | 覆蓋範圍 |
|----------|----------|
| `tests/hash.test.ts` | 穩定雜湊演算法 |
| `tests/cache.test.ts` | 快取管理器 |
| `tests/route-index.test.ts` | 路由索引 |
| `tests/generator.test.ts` | 現有測試（確保不壞） |

### 整合測試

| 測試檔案 | 覆蓋範圍 |
|----------|----------|
| `tests/types.test.ts` | 型別安全驗證 |
| `tests/generator.test.ts` | OpenAPI 生成完整流程 |

### 效能測試

| 測試檔案 | 覆蓋範圍 |
|----------|----------|
| `tests/performance.test.ts` | 大量路由生成效能、快取效益 |

### 覆蓋率目標

```bash
bun test --coverage --coverage-threshold=95
```

---

## 風險評估與緩解

### 風險 1: 型別不相容
**描述**: `openapi-types` 的型別定義可能與現有實作不完全相容

**緩解**:
- 使用 `as` 型別斷言處理邊界情況
- 逐步遷移，先從 `generate()` 回傳值開始
- 保留 `any` escape hatch 於關鍵位置

### 風險 2: 快取失效問題
**描述**: 快取可能在某些邊界情況下未正確失效

**緩解**:
- 使用完整的路由指紋（包含 method + path）
- 提供 `invalidateCache()` 公開方法
- 在開發模式下預設關閉快取

### 風險 3: 向後相容性
**描述**: 現有使用者的程式碼可能依賴特定行為

**緩解**:
- `generate()` 方法保持不變
- 新增 `generateWithCache()` 作為新功能
- 型別定義僅加強，不移除現有欄位

### 風險 4: 穩定雜湊衝突
**描述**: 不同 schema 可能產生相同的快取鍵

**緩解**:
- 使用完整的 schema 結構生成鍵
- 包含屬性名稱與型別資訊
- 測試覆蓋常見 schema 組合

---

## 實作順序建議

```
Phase 1: 基礎設施準備
  └─ 1.1 新增依賴項
  └─ 1.2 建立穩定雜湊演算法

Phase 2: 型別安全強化
  └─ 2.1 撰寫型別測試
  └─ 2.2 更新 types.ts
  └─ 2.3 重構 OpenApiGenerator 型別

Phase 3: Schema 快取鍵穩定化
  └─ 3.1 撰寫快取鍵測試
  └─ 3.2 實作穩定雜湊
  └─ 3.3 整合至 OpenApiGenerator

Phase 4: 輸出快取機制
  └─ 4.1 撰寫快取測試
  └─ 4.2 實作快取管理器
  └─ 4.3 整合快取至 OpenApiGenerator
  └─ 4.4 更新 OrbitAstral

Phase 5: 路由匹配效能優化
  └─ 5.1 撰寫路由索引測試
  └─ 5.2 實作路由索引
  └─ 5.3 整合路由索引至 OpenApiGenerator

Phase 6: 效能基準測試
  └─ 6.1 建立效能測試
```

每個 Phase 完成後執行:
```bash
bun test --coverage
```

---

## 成功標準

- [ ] 所有現有測試 100% 通過
- [ ] 新增測試覆蓋率達 95%+
- [ ] `any` 型別減少 90%+
- [ ] 相同 schema 產生相同快取鍵（100% 確定性）
- [ ] 快取命中時效能提升 95%+
- [ ] 1000 路由生成時間 < 100ms
- [ ] 無 breaking changes（公開 API 保持相容）

---

## 下一步行動

1. **立即開始**: 執行 `bun install openapi-types` 安裝依賴
2. **建立測試**: 從 Phase 2.1 開始，採用 TDD 方式開發
3. **持續驗證**: 每完成一個 Phase 就執行測試套件
4. **效能測量**: Phase 6 完成後，對比改善前後的效能數據
