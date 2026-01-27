# @gravito/mass 優化改進計劃

## 📋 概述

本文件描述 `@gravito/mass` 套件的優化改進計劃，旨在提升程式碼品質、文件完整性、測試覆蓋率，以及 AI 工具對程式碼的理解能力。

## 🎯 優化目標

1. **增強 JSDoc 註解** - 提升 AI 理解能力與開發者體驗
2. **改善型別安全性** - 減少 `any` 型別使用
3. **擴展測試覆蓋率** - 達到 80% 以上覆蓋率
4. **功能增強** - 新增實用工具函數
5. **文件完善** - 豐富使用範例與錯誤處理說明

---

## 📁 現況分析

### 套件結構
```
packages/mass/
├── src/
│   ├── index.ts      # 主要匯出檔
│   └── validator.ts  # 驗證中介軟體
├── tests/
│   └── index.test.ts # 基本測試
└── README.md
```

### 現有問題

| 問題類型 | 說明 | 優先級 |
|---------|------|--------|
| JSDoc 不完整 | 缺少詳細的參數說明和回傳值描述 | 高 |
| 型別安全性 | `validate` 函數中使用多個 `any` 型別 | 高 |
| 測試不足 | 僅有基本導出測試，缺少實際驗證測試 | 高 |
| 功能單一 | 僅提供基本 validate 函數 | 中 |
| 錯誤處理 | 缺少自訂錯誤訊息和錯誤格式化功能 | 中 |

---

## 🔧 改進項目

### Phase 1: JSDoc 增強（高優先級）

#### 1.1 `src/index.ts` 改進

**目前狀態：**
```typescript
/**
 * @gravito/mass
 *
 * TypeBox-based validation for Gravito
 * High-performance schema validation with full TypeScript support
 */
```

**建議改進：**
```typescript
/**
 * @gravito/mass - TypeBox-based validation for Gravito Galaxy Architecture.
 *
 * Mass provides high-performance schema validation with full TypeScript support,
 * seamlessly integrating with Photon middleware system. Named after the concept
 * of "mass" in physics, this package provides the "weight" of data integrity
 * to your API endpoints.
 *
 * Key Features:
 * - Zero-overhead TypeBox validation
 * - Full TypeScript inference for validated data
 * - Multiple validation sources (JSON, query, params, form)
 * - Custom error handling hooks
 * - Seamless Photon/Hono integration
 *
 * @example Basic JSON validation
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { Schema, validate } from '@gravito/mass'
 *
 * const app = new Photon()
 *
 * const loginSchema = Schema.Object({
 *   username: Schema.String({ minLength: 3, maxLength: 50 }),
 *   password: Schema.String({ minLength: 8 })
 * })
 *
 * app.post('/login', validate('json', loginSchema), (c) => {
 *   const { username } = c.req.valid('json')
 *   return c.json({ success: true, user: username })
 * })
 * ```
 *
 * @example Custom error handling
 * ```typescript
 * app.post('/register',
 *   validate('json', registerSchema, (result, c) => {
 *     if (!result.success) {
 *       return c.json({
 *         error: 'Validation failed',
 *         details: result.errors
 *       }, 400)
 *     }
 *   }),
 *   handler
 * )
 * ```
 *
 * @see {@link validate} - Main validation middleware
 * @see {@link Schema} - TypeBox schema builders
 * @see {@link https://github.com/sinclairzx81/typebox | TypeBox Documentation}
 *
 * @packageDocumentation
 */
```

#### 1.2 `src/validator.ts` 改進

**目前狀態：**
```typescript
export function validate<
  T extends TSchema,
  S extends ValidationSource,
  E extends Env = any,
  P extends string = any,
>(
  source: S,
  schema: T,
  hook?: (result: any, c: any) => any
): MiddlewareHandler<...>
```

**建議改進：**
```typescript
/**
 * Validation result passed to the hook callback.
 *
 * @template T - The TypeBox schema type being validated
 */
export interface ValidationResult<T extends TSchema> {
  /** Whether the validation passed */
  success: boolean
  /** The validated data (only present if success is true) */
  data?: Static<T>
  /** Validation errors (only present if success is false) */
  errors?: Array<{
    path: string
    message: string
  }>
}

/**
 * Hook function type for custom validation result handling.
 *
 * @template T - The TypeBox schema type
 * @template E - The Hono environment type
 */
export type ValidationHook<T extends TSchema, E extends Env> = (
  result: ValidationResult<T>,
  c: Context<E>
) => Response | Promise<Response> | void

/**
 * Create a validation middleware using TypeBox schemas.
 *
 * This function creates a Photon-compatible middleware that validates
 * incoming request data against a TypeBox schema. On validation failure,
 * it returns a 400 response with error details by default.
 *
 * @template T - The TypeBox schema type
 * @template S - The validation source type
 * @template E - The Hono environment type
 * @template P - The route path type
 *
 * @param source - The request data source to validate
 *   - `'json'`: Request body (Content-Type: application/json)
 *   - `'query'`: URL query parameters
 *   - `'param'`: Route parameters (e.g., /users/:id)
 *   - `'form'`: Form data (Content-Type: multipart/form-data)
 *
 * @param schema - TypeBox schema defining the expected data structure
 *
 * @param hook - Optional callback for custom validation result handling.
 *   Return a Response to override the default behavior.
 *
 * @returns A Photon middleware handler with full type inference
 *
 * @example JSON body validation
 * ```typescript
 * const userSchema = Schema.Object({
 *   name: Schema.String({ minLength: 1 }),
 *   email: Schema.String({ format: 'email' }),
 *   age: Schema.Optional(Schema.Number({ minimum: 0 }))
 * })
 *
 * app.post('/users', validate('json', userSchema), (c) => {
 *   const user = c.req.valid('json')
 *   // user is fully typed as { name: string, email: string, age?: number }
 *   return c.json({ created: user })
 * })
 * ```
 *
 * @example Query parameter validation
 * ```typescript
 * const searchSchema = Schema.Object({
 *   q: Schema.String(),
 *   page: Schema.Optional(Schema.Number({ minimum: 1, default: 1 })),
 *   limit: Schema.Optional(Schema.Number({ minimum: 1, maximum: 100, default: 20 }))
 * })
 *
 * app.get('/search', validate('query', searchSchema), (c) => {
 *   const { q, page, limit } = c.req.valid('query')
 *   return c.json({ query: q, page, limit })
 * })
 * ```
 *
 * @example Custom error response
 * ```typescript
 * app.post('/api/data',
 *   validate('json', schema, (result, c) => {
 *     if (!result.success) {
 *       return c.json({
 *         code: 'VALIDATION_ERROR',
 *         message: 'Invalid request data',
 *         fields: result.errors
 *       }, 422)
 *     }
 *   }),
 *   handler
 * )
 * ```
 *
 * @throws Will not throw - validation errors are handled via response
 *
 * @see {@link ValidationSource} - Available validation sources
 * @see {@link Schema} - TypeBox schema builders
 */
export function validate<...>(...)
```

---

### Phase 2: 型別安全性改進（高優先級）

#### 2.1 減少 `any` 型別使用

**檔案：** `src/validator.ts`

```typescript
// 目前
export function validate<
  T extends TSchema,
  S extends ValidationSource,
  E extends Env = any,     // ← any
  P extends string = any,  // ← any
>(
  source: S,
  schema: T,
  hook?: (result: any, c: any) => any  // ← 三個 any
)

// 建議
export function validate<
  T extends TSchema,
  S extends ValidationSource,
  E extends Env = Env,
  P extends string = string,
>(
  source: S,
  schema: T,
  hook?: ValidationHook<T, E>
)
```

#### 2.2 新增型別定義

```typescript
// src/types.ts（新檔案）

import type { Static, TSchema } from '@sinclair/typebox'
import type { Context, Env } from '@gravito/photon'

/**
 * Available validation source types.
 */
export type ValidationSource = 'json' | 'query' | 'param' | 'form'

/**
 * Validation error detail.
 */
export interface ValidationError {
  /** JSON path to the invalid field (e.g., "/name" or "/items/0/id") */
  path: string
  /** Human-readable error message */
  message: string
  /** The expected type or constraint */
  expected?: string
  /** The actual received value (type) */
  received?: string
}

/**
 * Result object passed to validation hooks.
 */
export interface ValidationResult<T extends TSchema> {
  success: boolean
  data?: Static<T>
  errors?: ValidationError[]
}

/**
 * Hook function for custom validation handling.
 */
export type ValidationHook<T extends TSchema, E extends Env = Env> = (
  result: ValidationResult<T>,
  context: Context<E>
) => Response | Promise<Response> | void
```

---

### Phase 3: 測試擴展（高優先級）

#### 3.1 新增測試案例

```typescript
// tests/validator.test.ts（新檔案）

describe('validate middleware', () => {
  describe('JSON validation', () => {
    it('should pass valid JSON body')
    it('should reject invalid JSON body with 400')
    it('should provide type inference for valid data')
    it('should handle nested object validation')
    it('should handle array validation')
  })

  describe('Query validation', () => {
    it('should parse and validate query parameters')
    it('should handle optional parameters')
    it('should apply default values')
    it('should coerce string numbers to numbers')
  })

  describe('Param validation', () => {
    it('should validate route parameters')
    it('should reject invalid route params')
  })

  describe('Form validation', () => {
    it('should validate multipart form data')
    it('should handle file uploads with schema')
  })

  describe('Custom hooks', () => {
    it('should call hook with validation result')
    it('should allow custom error response')
    it('should proceed to handler if hook returns void')
  })

  describe('Error formatting', () => {
    it('should return structured error messages')
    it('should include field paths in errors')
  })
})
```

#### 3.2 整合測試

```typescript
// tests/integration.test.ts（新檔案）

describe('Mass + Photon integration', () => {
  it('should work with app.get()')
  it('should work with app.post()')
  it('should work with app.route()')
  it('should maintain type inference through route composition')
})
```

---

### Phase 4: 功能增強（中優先級）

#### 4.1 新增工具函數

```typescript
// src/utils.ts（新檔案）

/**
 * Create a partial schema from an existing schema.
 * All fields become optional.
 */
export function partial<T extends TObject>(schema: T): TPartial<T>

/**
 * Create a schema with only specified fields.
 */
export function pick<T extends TObject, K extends keyof Static<T>>(
  schema: T,
  keys: K[]
): TPick<T, K>

/**
 * Create a schema without specified fields.
 */
export function omit<T extends TObject, K extends keyof Static<T>>(
  schema: T,
  keys: K[]
): TOmit<T, K>

/**
 * Merge two object schemas.
 */
export function merge<A extends TObject, B extends TObject>(
  a: A,
  b: B
): TMerge<A, B>

/**
 * Create a validation middleware that validates multiple sources.
 */
export function validateMultiple(validations: Array<{
  source: ValidationSource
  schema: TSchema
}>): MiddlewareHandler
```

#### 4.2 錯誤格式化

```typescript
// src/errors.ts（新檔案）

/**
 * Custom validation error class.
 */
export class MassValidationError extends Error {
  constructor(
    public readonly source: ValidationSource,
    public readonly errors: ValidationError[]
  ) {
    super(`Validation failed for ${source}`)
    this.name = 'MassValidationError'
  }

  toJSON(): object {
    return {
      error: 'ValidationError',
      source: this.source,
      details: this.errors
    }
  }
}

/**
 * Format validation errors for API response.
 */
export function formatErrors(errors: ValidationError[]): object
```

---

### Phase 5: 文件完善（中優先級）

#### 5.1 README 增強項目

- [ ] 新增「架構說明」章節
- [ ] 新增「進階用法」章節
- [ ] 新增「錯誤處理」章節
- [ ] 新增「與其他套件整合」章節
- [ ] 新增「效能考量」章節
- [ ] 新增「API 參考」章節

#### 5.2 範例程式碼

- [ ] 新增完整的 CRUD API 範例
- [ ] 新增自訂驗證規則範例
- [ ] 新增檔案上傳驗證範例
- [ ] 新增 Beam 用戶端整合範例

---

## 📅 實施時程

| Phase | 內容 | 預估工作量 |
|-------|------|-----------|
| Phase 1 | JSDoc 增強 | 中 |
| Phase 2 | 型別安全性改進 | 中 |
| Phase 3 | 測試擴展 | 大 |
| Phase 4 | 功能增強 | 大 |
| Phase 5 | 文件完善 | 小 |

---

## ✅ 驗收標準

1. **JSDoc 完整性**
   - 所有公開 API 都有完整的 JSDoc 註解
   - 包含 `@example`、`@param`、`@returns`、`@throws` 標籤
   - AI 工具能準確理解和使用 API

2. **型別安全性**
   - 無 `any` 型別（或最小化使用並有註解說明）
   - 所有公開介面都有明確型別定義
   - TypeScript strict mode 通過

3. **測試覆蓋率**
   - 整體覆蓋率 ≥ 80%
   - 所有公開 API 都有測試
   - 包含邊界條件和錯誤處理測試

4. **功能完整性**
   - 核心驗證功能正常運作
   - 工具函數可選使用
   - 向後相容現有 API

---

## 📝 備註

- 所有改進應保持向後相容性
- 遵循專案既有的程式碼風格
- 每個 Phase 完成後進行 code review
- 重大變更需更新 CHANGELOG.md
