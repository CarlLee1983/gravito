# Gravito 框架優化路線圖 (Optimization Roadmap)

**創建日期**: 2026-01-16
**分支建議**: `optimize/comprehensive-improvements`
**狀態**: 📋 規劃完成，待實作
**預估總工時**: ~40-50 小時

---

## 📊 優化總覽

本路線圖涵蓋 Phase 1-4 技術債清理後的進階優化項目。

| 類別 | 項目數 | 嚴重度 | 預估工時 |
|------|--------|--------|----------|
| 核心類型安全 | 44 處 @ts-expect-error | 🟡 Medium | 8-10h |
| 功能完善 | 9 處 TODO/FIXME | 🟡 Medium | 6-8h |
| 測試覆蓋率 | 待評估 | 🟡 Medium | 8-10h |
| 文檔完善 | 623 個導出符號 | 🟢 Low | 10-12h |
| 代碼重構 | 3+ 大型文件 | 🟢 Low | 8-10h |
| 性能優化 | Bundle & 依賴 | 🟢 Low | 4-6h |

---

## 🎯 Phase 11: 核心模塊 @ts-expect-error 清理

### 11.1 概述
**優先級**: 🟡 P2 - Medium
**預估工時**: 8-10 小時
**影響範圍**: `packages/core`, `packages/prism`, `packages/cosmos`

### 11.2 問題描述

目前有 44 處 `@ts-expect-error` 使用：
- **Core 核心** (8 處) - engine/Gravito.ts (7), adapters/PhotonAdapter.ts (1)
- **Prism** (1 處) - TemplateEngine.ts
- **Cosmos** (1 處) - tests/manager.test.ts
- **Atlas 測試** (28 處) - 測試代碼，優先級較低
- **其他測試** (6 處) - 測試代碼，優先級較低

### 11.3 處理策略

#### 策略 A: 改善類型定義
```typescript
// Before
// @ts-expect-error - Property doesn't exist
const value = obj.someProperty

// After - 使用類型守衛
function hasProperty<T, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj
}

if (hasProperty(obj, 'someProperty')) {
  const value = obj.someProperty
}
```

#### 策略 B: 使用泛型改善
```typescript
// Before
// @ts-expect-error - Type mismatch
return doSomething(value)

// After - 添加泛型約束
function doSomething<T extends SomeBase>(value: T): Result<T> {
  // ...
}
```

#### 策略 C: 合理保留並註釋
```typescript
// Before
// @ts-expect-error

// After - 添加清晰的註釋
// @ts-expect-error - Intentional type assertion for cross-runtime compatibility
// Bun's types differ from Node's ReadableStream implementation
const stream = nodeStream as unknown as ReadableStream<Uint8Array>
```

### 11.4 實現步驟

#### Step 11.4.1: Core engine/Gravito.ts 分析
**文件**: `packages/core/src/engine/Gravito.ts`

```bash
# 查看所有 @ts-expect-error
grep -n "@ts-expect-error" packages/core/src/engine/Gravito.ts
```

對每個使用：
1. 閱讀上下文，理解為何需要
2. 嘗試策略 A 或 B 來移除
3. 若無法移除，使用策略 C 添加詳細註釋

#### Step 11.4.2: PhotonAdapter 類型改善
**文件**: `packages/core/src/adapters/PhotonAdapter.ts`

Photon adapter 可能涉及跨框架類型轉換，需要：
1. 檢查 Photon 的類型定義
2. 創建適當的類型橋接
3. 使用泛型減少類型斷言

#### Step 11.4.3: Prism TemplateEngine
**文件**: `packages/prism/src/TemplateEngine.ts`

模板引擎通常涉及動態屬性訪問：
1. 考慮使用 `Record<string, unknown>` 或 `Map`
2. 添加運行時驗證
3. 改善錯誤消息

### 11.5 驗收標準
- [ ] Core 中的 8 處 @ts-expect-error 已處理（移除或添加詳細註釋）
- [ ] Prism 中的 1 處 @ts-expect-error 已處理
- [ ] `bun run typecheck` 通過
- [ ] 所有測試通過
- [ ] 為保留的 @ts-expect-error 添加了清晰的註釋說明原因

### 11.6 測試驗證
```bash
# 運行類型檢查
bun run typecheck:full

# 運行相關測試
cd packages/core && bun test
cd packages/prism && bun test

# 檢查剩餘的 @ts-expect-error
grep -r "@ts-expect-error" packages/core/src packages/prism/src --exclude-dir=tests
```

---

## 🎯 Phase 12: 功能性 TODO 清理

### 12.1 概述
**優先級**: 🟡 P2 - Medium
**預估工時**: 6-8 小時
**影響範圍**: `packages/core`, `packages/cli`, `packages/zenith`

### 12.2 TODO 清單

| 文件 | 行號 | 描述 | 優先級 |
|------|------|------|--------|
| `core/src/engine/Gravito.ts` | TBD | 核心引擎待辦 | 🔴 High |
| `cli/src/commands/DrizzleMigrationDriver.ts` | TBD | Drizzle 遷移支持 | 🟡 Medium |
| `cli/src/commands/AtlasMigrationDriver.ts` | TBD | Atlas 遷移改進 | 🟡 Medium |
| `zenith/src/client/components/LogArchiveModal.tsx` | TBD | 日誌歸檔功能 | 🟢 Low |

**注意**: Scaffold 生成器中的 TODO 是 placeholder，應保留。

### 12.3 實現步驟

#### Step 12.3.1: 核心引擎 TODO 處理
**文件**: `packages/core/src/engine/Gravito.ts`

```bash
# 定位 TODO
grep -n "TODO\|FIXME" packages/core/src/engine/Gravito.ts
```

處理流程：
1. 閱讀 TODO 描述和上下文
2. 評估實現複雜度
3. 如果簡單（< 1h），直接實現
4. 如果複雜，創建詳細的實現計劃或 GitHub Issue

#### Step 12.3.2: CLI 遷移驅動改進
**文件**:
- `packages/cli/src/commands/DrizzleMigrationDriver.ts`
- `packages/cli/src/commands/AtlasMigrationDriver.ts`

目標：
1. 統一遷移接口
2. 改善錯誤處理
3. 添加回滾支持（如果缺失）
4. 添加遷移狀態追蹤

範例實現：
```typescript
// 統一遷移接口
interface MigrationDriver {
  up(): Promise<void>
  down(): Promise<void>
  status(): Promise<MigrationStatus>
  history(): Promise<MigrationRecord[]>
}

// 改善錯誤處理
async up(): Promise<void> {
  try {
    await this.executeUp()
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    throw new MigrationError(`Failed to run migration: ${err.message}`, {
      cause: err,
      driver: this.name,
    })
  }
}
```

#### Step 12.3.3: Zenith 日誌歸檔
**文件**: `packages/zenith/src/client/components/LogArchiveModal.tsx`

實現建議：
1. 添加日期範圍選擇器
2. 實現歸檔導出（JSON, CSV）
3. 添加壓縮選項
4. 實現進度指示器

```typescript
// 歸檔功能範例
interface ArchiveOptions {
  startDate: Date
  endDate: Date
  format: 'json' | 'csv'
  compress: boolean
}

async function archiveLogs(options: ArchiveOptions): Promise<Blob> {
  // 1. 查詢指定日期範圍的日誌
  // 2. 轉換為指定格式
  // 3. 可選壓縮
  // 4. 返回 Blob 供下載
}
```

### 12.4 驗收標準
- [ ] 所有功能性 TODO 已實現或創建了詳細的實現計劃
- [ ] 新功能有相應的測試
- [ ] 文檔已更新
- [ ] `bun run typecheck` 通過
- [ ] 所有測試通過

---

## 🎯 Phase 13: 測試覆蓋率提升 ✅

### 13.1 概述
**優先級**: 🟡 P2 - Medium
**預估工時**: 8-10 小時
**影響範圍**: 所有缺少測試的核心模塊

### 13.2 當前狀態

- 總測試文件數：197
- 導出符號數：623
- 覆蓋率目標：**80%+**

### 13.3 實現步驟

#### Step 13.3.1: 生成覆蓋率報告
```bash
# 運行所有測試並生成覆蓋率報告
bun test --coverage --coverage-dir=coverage

# 查看 HTML 報告
open coverage/index.html

# 或使用 c8 生成詳細報告
bunx c8 --reporter=html --reporter=text bun test
```

#### Step 13.3.2: 識別低覆蓋率模塊

創建腳本識別覆蓋率 < 80% 的文件：
```typescript
// scripts/check-coverage.ts
import { readFileSync } from 'fs'
import { join } from 'path'

const coverageReport = JSON.parse(
  readFileSync(join(process.cwd(), 'coverage/coverage-summary.json'), 'utf-8')
)

const lowCoverage: Array<{ file: string; lines: number; branches: number }> = []

for (const [file, stats] of Object.entries(coverageReport)) {
  if (file.includes('node_modules') || file.includes('.test.')) continue

  const lines = stats.lines.pct
  const branches = stats.branches.pct

  if (lines < 80 || branches < 80) {
    lowCoverage.push({ file, lines, branches })
  }
}

// 按覆蓋率排序
lowCoverage.sort((a, b) => a.lines - b.lines)

console.table(lowCoverage)
```

#### Step 13.3.3: 優先處理核心模塊

按此順序補充測試：
1. **Core** - Application, Router, Middleware
2. **Atlas** - Model, QueryBuilder, Relations
3. **Sentinel** - Authentication, Authorization
4. **Signal** - Mail, Notifications
5. **其他** - 按使用頻率排序

#### Step 13.3.4: 測試模板

為常見模式創建測試模板：

```typescript
// 測試模板 1: Controller/Route 測試
import { describe, it, expect, beforeEach } from 'bun:test'
import { Application } from '@gravito/core'

describe('FeatureController', () => {
  let app: Application

  beforeEach(() => {
    app = new Application({})
    // Setup routes
  })

  it('should handle GET request', async () => {
    const res = await app.fetch(new Request('http://localhost/endpoint'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ success: true })
  })

  it('should validate input', async () => {
    const res = await app.fetch(
      new Request('http://localhost/endpoint', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
      })
    )
    expect(res.status).toBe(422)
  })

  it('should handle errors gracefully', async () => {
    // Test error scenarios
  })
})
```

```typescript
// 測試模板 2: Service/Utility 測試
import { describe, it, expect } from 'bun:test'

describe('UtilityFunction', () => {
  it('should handle normal input', () => {
    const result = utilityFunction('input')
    expect(result).toBe('expected')
  })

  it('should handle edge cases', () => {
    expect(utilityFunction('')).toBe('')
    expect(utilityFunction(null)).toBe(null)
  })

  it('should throw on invalid input', () => {
    expect(() => utilityFunction(undefined)).toThrow()
  })
})
```

```typescript
// 測試模板 3: Class/ORM 測試
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

describe('ModelClass', () => {
  beforeEach(async () => {
    // Setup database
    await setupTestDB()
  })

  afterEach(async () => {
    // Cleanup
    await teardownTestDB()
  })

  it('should create record', async () => {
    const record = await Model.create({ name: 'Test' })
    expect(record.id).toBeDefined()
    expect(record.name).toBe('Test')
  })

  it('should query records', async () => {
    // Seed data
    await Model.create({ name: 'Test1' })
    await Model.create({ name: 'Test2' })

    const results = await Model.query().where('name', 'like', 'Test%').get()
    expect(results.length).toBe(2)
  })

  it('should update record', async () => {
    const record = await Model.create({ name: 'Old' })
    await record.update({ name: 'New' })

    const updated = await Model.find(record.id)
    expect(updated.name).toBe('New')
  })

  it('should delete record', async () => {
    const record = await Model.create({ name: 'Delete Me' })
    await record.delete()

    const deleted = await Model.find(record.id)
    expect(deleted).toBeNull()
  })
})
```

### 13.4 驗收標準
- [ ] 整體測試覆蓋率達到 80%+
- [ ] 核心模塊覆蓋率達到 90%+
- [ ] 所有公開 API 都有測試
- [ ] 測試運行時間 < 5 分鐘（考慮並行化）
- [ ] CI/CD 集成覆蓋率檢查

### 13.5 測試最佳實踐

```typescript
// ✅ Good - 描述清晰，單一職責
it('should return 404 when user not found', async () => {
  const res = await app.fetch(new Request('http://localhost/users/999'))
  expect(res.status).toBe(404)
})

// ❌ Bad - 測試多個行為
it('should work', async () => {
  // Tests multiple things...
})

// ✅ Good - 使用 AAA 模式（Arrange, Act, Assert）
it('should calculate discount correctly', () => {
  // Arrange
  const price = 100
  const discountRate = 0.2

  // Act
  const result = calculateDiscount(price, discountRate)

  // Assert
  expect(result).toBe(80)
})

// ✅ Good - 測試邊界條件
describe('validateEmail', () => {
  it('should accept valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
  })

  it('should reject invalid formats', () => {
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('@example.com')).toBe(false)
  })

  it('should handle edge cases', () => {
    expect(validateEmail('a@b.c')).toBe(true) // shortest valid
    expect(validateEmail('x'.repeat(64) + '@example.com')).toBe(true) // max local part
  })
})
```

---

## 🎯 Phase 14: 公開 API 文檔完善 🔄

### 14.1 概述
**優先級**: 🟡 P2 - Medium
**預估工時**: 10-12 小時
**影響範圍**: 所有 packages

### 14.2 當前狀態

- 導出符號數：623
- JSDoc 覆蓋率：
  - Core: ✅ 100% (Completed)
  - Atlas: ✅ 100% (Completed)
  - Sentinel: ✅ 100% (Completed)
  - Monolith: ✅ 100% (Completed)
  - Photon: ✅ 100% (Partial/Key Exports)
  - Other Packages: Pending
- 目標：100% 公開 API 有完整文檔

### 14.3 文檔標準

#### 基本 JSDoc 格式
```typescript
/**
 * Brief one-line description of the function/class.
 *
 * Detailed explanation of what this does, when to use it,
 * and any important notes.
 *
 * @param paramName - Description of parameter
 * @param options - Configuration options
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * ```typescript
 * const result = functionName('value', { option: true })
 * console.log(result) // Output: expected result
 * ```
 *
 * @see {@link RelatedFunction} for related functionality
 * @since 3.0.0
 * @public
 */
export function functionName(
  paramName: string,
  options?: Options
): Result {
  // ...
}
```

#### Class 文檔
```typescript
/**
 * Manages user authentication and session handling.
 *
 * This class provides methods for login, logout, and session
 * management. It integrates with various authentication providers.
 *
 * @example
 * ```typescript
 * const auth = new AuthManager({
 *   driver: 'session',
 *   timeout: 3600
 * })
 *
 * await auth.login(credentials)
 * const user = await auth.user()
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class AuthManager {
  /**
   * Create a new AuthManager instance.
   *
   * @param config - Authentication configuration
   */
  constructor(config: AuthConfig) {
    // ...
  }

  /**
   * Authenticate user with credentials.
   *
   * @param credentials - User credentials
   * @returns True if authentication successful
   * @throws {AuthenticationError} If credentials are invalid
   *
   * @example
   * ```typescript
   * const success = await auth.login({
   *   email: 'user@example.com',
   *   password: 'secret'
   * })
   * ```
   */
  async login(credentials: Credentials): Promise<boolean> {
    // ...
  }
}
```

#### Interface 文檔
```typescript
/**
 * Configuration options for the application.
 *
 * @example
 * ```typescript
 * const config: ApplicationConfig = {
 *   port: 3000,
 *   env: 'production',
 *   database: {
 *     host: 'localhost',
 *     port: 5432
 *   }
 * }
 * ```
 *
 * @public
 */
export interface ApplicationConfig {
  /**
   * Server port number.
   * @default 3000
   */
  port?: number

  /**
   * Application environment.
   * @default 'development'
   */
  env?: 'development' | 'production' | 'test'

  /**
   * Database configuration.
   * Required if using database features.
   */
  database?: DatabaseConfig
}
```

### 14.4 實現步驟

#### Step 14.4.1: 審計現有文檔
```bash
# 創建腳本檢查缺少 JSDoc 的導出
cat > scripts/check-docs.ts << 'EOF'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function findExportsWithoutDocs(dir: string): void {
  const files = readdirSync(dir)

  for (const file of files) {
    const fullPath = join(dir, file)

    if (statSync(fullPath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist')) {
        findExportsWithoutDocs(fullPath)
      }
      continue
    }

    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue

    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (/^export (class|function|interface|type|const)/.test(line)) {
        // Check if previous line has JSDoc
        const prevLine = i > 0 ? lines[i - 1].trim() : ''

        if (!prevLine.endsWith('*/')) {
          const match = line.match(/export \w+ (\w+)/)
          if (match) {
            console.log(`${fullPath}:${i + 1} - Missing docs for: ${match[1]}`)
          }
        }
      }
    }
  }
}

findExportsWithoutDocs('packages')
EOF

bun scripts/check-docs.ts > docs/missing-docs.txt
```

#### Step 14.4.2: 優先級排序
1. **Core 核心 API** - Application, Router, Context ✅ (完成)
2. **ORM** - Model, QueryBuilder ✅ (完成)
3. **Authentication** - Auth, Sessions ✅ (完成)
4. **其他** - 按使用頻率 (Monolith ✅)

#### Step 14.4.3: 添加文檔模板
```typescript
// 為每個 package 創建文檔指南
// packages/core/DOCUMENTING.md

# Core Package Documentation Guide

## Required Documentation

All exported symbols must have:
- Brief description (one-line summary)
- Detailed explanation
- Parameter descriptions
- Return value description
- At least one usage example
- @since tag with version number

## Examples

See [TEMPLATE.md](../../docs/TEMPLATE.md) for JSDoc templates.

## Generating Docs

```bash
# Generate API documentation
bun run docs:generate

# Serve documentation locally
bun run docs:serve
```
```

#### Step 14.4.4: 生成 API 文檔網站

使用 TypeDoc 或類似工具：
```bash
# 安裝 TypeDoc
bun add -D typedoc

# 添加 script 到 package.json
{
  "scripts": {
    "docs:generate": "typedoc --out docs/api packages/**/src/index.ts",
    "docs:serve": "bunx serve docs/api"
  }
}

# 生成文檔
bun run docs:generate
```

### 14.5 驗收標準
- [ ] 100% 公開 API 有 JSDoc 文檔
- [ ] 所有文檔包含使用範例
- [ ] API 文檔網站可以生成並瀏覽
- [ ] 文檔遵循統一的格式標準
- [ ] 創建了文檔貢獻指南

---

## 🎯 Phase 15: 大型文件重構

### 15.1 概述
**優先級**: 🟢 P3 - Low
**預估工時**: 8-10 小時
**影響範圍**: `packages/atlas`, `packages/scaffold`

### 15.2 需要重構的文件

| 文件 | 行數 | 建議拆分方式 |
|------|------|-------------|
| `atlas/src/orm/model/Model.ts` | 1,597 | 拆分為 Model + Traits + Concerns |
| `atlas/src/query/QueryBuilder.ts` | 1,339 | 拆分為 Builder + Clauses + Execution |
| `scaffold/src/generators/BaseGenerator.ts` | 1,169 | 拆分為 Base + Templates + FileOps |
| `scaffold/src/generators/DddGenerator.ts` | 1,074 | 使用組合而非繼承 |

### 15.3 重構策略

#### 策略 A: 使用 Mixins/Traits
```typescript
// Before - 1,597 lines in Model.ts
export class Model {
  // All methods in one file
}

// After - Split into concerns
// Model.ts (~300 lines)
export class Model extends applyMixins(
  BaseModel,
  [HasAttributes, HasRelationships, HasEvents, HasScopes]
) {
  // Core model functionality
}

// concerns/HasAttributes.ts (~200 lines)
export class HasAttributes {
  getAttribute(key: string): unknown { }
  setAttribute(key: string, value: unknown): void { }
  getCasts(): Record<string, string> { }
}

// concerns/HasRelationships.ts (~400 lines)
export class HasRelationships {
  hasMany(related: typeof Model): Relation { }
  belongsTo(related: typeof Model): Relation { }
  // ...
}

// concerns/HasEvents.ts (~150 lines)
export class HasEvents {
  static boot(): void { }
  fireEvent(event: string): void { }
}

// concerns/HasScopes.ts (~200 lines)
export class HasScopes {
  scope(name: string, callback: Function): this { }
  // ...
}
```

#### 策略 B: 提取獨立模塊
```typescript
// Before - QueryBuilder.ts (1,339 lines)
export class QueryBuilder {
  select() { }
  where() { }
  join() { }
  groupBy() { }
  having() { }
  orderBy() { }
  limit() { }
  offset() { }
  // ... 100+ more methods
}

// After - Split into modules
// QueryBuilder.ts (~200 lines)
export class QueryBuilder {
  constructor(
    private select: SelectClause,
    private where: WhereClause,
    private join: JoinClause,
    private group: GroupByClause,
    private order: OrderByClause,
    private limit: LimitClause
  ) {}
}

// clauses/SelectClause.ts
export class SelectClause {
  private columns: string[] = ['*']

  select(...columns: string[]): void {
    this.columns = columns
  }

  toSQL(): string {
    return `SELECT ${this.columns.join(', ')}`
  }
}

// clauses/WhereClause.ts
export class WhereClause {
  private conditions: Condition[] = []

  where(column: string, operator: string, value: unknown): void {
    this.conditions.push({ column, operator, value })
  }

  toSQL(): string {
    // Build WHERE clause
  }
}
```

### 15.4 實現步驟

#### Step 15.4.1: Model.ts 重構

```typescript
// 1. 識別可分離的關注點
// - 屬性管理 (getAttribute, setAttribute, fill)
// - 關係管理 (hasMany, belongsTo, etc.)
// - 事件系統 (boot, fireEvent)
// - 查詢作用域 (scope, global scopes)
// - 序列化 (toJSON, toArray)
// - 軟刪除 (delete, restore, forceDelete)

// 2. 創建 concerns 目錄結構
mkdir -p packages/atlas/src/orm/model/concerns

// 3. 逐個提取 concern
// - 創建獨立的 concern 類
// - 移動相關方法
// - 更新類型定義
// - 運行測試確保功能正常

// 4. 使用 mixin 組合
// - 實現 applyMixins 工具函數
// - 更新 Model 類使用 mixins
// - 確保類型推導正確
```

#### Step 15.4.2: QueryBuilder.ts 重構

```typescript
// 1. 按 SQL 子句分組
// - SELECT (select, distinct, columns)
// - FROM (from, table)
// - JOIN (join, leftJoin, rightJoin, crossJoin)
// - WHERE (where, orWhere, whereIn, whereBetween)
// - GROUP BY (groupBy, having)
// - ORDER BY (orderBy, latest, oldest)
// - LIMIT/OFFSET (limit, offset, take, skip)

// 2. 創建 clause 類
mkdir -p packages/atlas/src/query/clauses

// 3. 提取每個 clause
// - 創建獨立的 clause 類
// - 實現 toSQL() 方法
// - 處理參數綁定

// 4. 更新 QueryBuilder
// - 使用組合而非繼承
// - 委託給各個 clause
// - 保持鏈式調用 API
```

### 15.5 驗收標準
- [ ] 所有文件 < 800 行
- [ ] 代碼組織清晰，職責單一
- [ ] 所有測試通過
- [ ] API 保持向後兼容
- [ ] 性能沒有明顯下降（< 5%）
- [ ] TypeScript 類型推導正確

### 15.6 測試驗證
```bash
# 運行所有測試
bun test

# 性能基準測試
bun run benchmark

# 檢查 bundle 大小
bun run build && ls -lh packages/*/dist/*.js
```

---

## 🎯 Phase 16: 性能優化

### 16.1 概述
**優先級**: 🟢 P3 - Low
**預估工時**: 4-6 小時
**影響範圍**: 依賴管理、Bundle 大小

### 16.2 優化目標

- 減少 node_modules 總大小
- 優化 bundle 大小（tree-shaking）
- 移除重複依賴
- 分析並優化熱路徑代碼

### 16.3 實現步驟

#### Step 16.3.1: 依賴審計
```bash
# 分析依賴大小
bunx bundlephobia-cli analyze

# 查找重複依賴
bun pm ls --all | sort | uniq -c | sort -rn

# 檢查過時依賴
bun update --dry-run

# 查找未使用的依賴
bunx depcheck
```

#### Step 16.3.2: Bundle 大小優化

```typescript
// 1. 檢查當前 bundle 大小
bun run build
ls -lh packages/*/dist/*.js

// 2. 分析 bundle 組成
bunx esbuild-visualizer

// 3. 優化策略
// - 使用動態 import 延遲加載
// - 標記 side-effect free 模塊
// - 優化 package.json exports

// package.json
{
  "sideEffects": false, // 或指定有副作用的文件
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.js"
    }
  }
}
```

#### Step 16.3.3: 代碼分割

```typescript
// 大型模塊使用動態 import
// Before
import { HeavyFeature } from './heavy-feature'

export function useFeature() {
  return new HeavyFeature()
}

// After
export async function useFeature() {
  const { HeavyFeature } = await import('./heavy-feature')
  return new HeavyFeature()
}
```

#### Step 16.3.4: 熱路徑優化

```typescript
// 使用 bun 的 profiler
// 1. 識別熱路徑
bun --prof myapp.ts
bun --prof-process isolate-*.log > profile.txt

// 2. 優化頻繁調用的函數
// - 避免不必要的對象創建
// - 使用對象池
// - 緩存計算結果

// Before - 每次創建新對象
function process(data: string[]) {
  return data.map(item => ({ value: item, processed: true }))
}

// After - 複用對象
const resultPool: any[] = []
function process(data: string[]) {
  return data.map((item, i) => {
    const result = resultPool[i] || (resultPool[i] = {})
    result.value = item
    result.processed = true
    return result
  })
}
```

### 16.4 驗收標準
- [ ] 總 bundle 大小減少 10%+
- [ ] node_modules 大小減少 15%+
- [ ] 沒有重複的主要依賴
- [ ] tree-shaking 正常工作
- [ ] 應用啟動時間沒有增加

### 16.5 基準測試
```typescript
// benchmarks/startup.bench.ts
import { bench, run } from 'mitata'

bench('Application startup', async () => {
  const { Application } = await import('@gravito/core')
  const app = new Application({})
  await app.init()
})

bench('Route registration', () => {
  const { Route } = require('@gravito/core')
  Route.get('/test', () => {})
})

await run()
```

---

## 📋 實施計劃時間軸

```
Week 1-2: Phase 11 (核心類型安全)
  Day 1-3:   Core engine 和 adapters
  Day 4-5:   Prism 和驗證
  Day 6-7:   測試和文檔
  Day 8-10:  Review 和修正

Week 3: Phase 12 (功能完善)
  Day 1-2:   核心引擎 TODO
  Day 3-4:   CLI 遷移改進
  Day 5:     Zenith 功能
  Day 6-7:   測試和文檔

Week 4-5: Phase 13 (測試覆蓋率)
  Day 1-2:   生成覆蓋率報告
  Day 3-5:   Core 模塊測試
  Day 6-8:   Atlas 模塊測試
  Day 9-10:  其他模塊測試

Week 6-7: Phase 14 (文檔完善)
  Day 1-2:   審計和規劃
  Day 3-5:   Core 文檔
  Day 6-8:   Atlas 文檔
  Day 9-10:  其他 packages
  Day 11-12: 生成文檔網站

Week 8: Phase 15 (代碼重構)
  Day 1-3:   Model.ts 重構
  Day 4-5:   QueryBuilder.ts 重構
  Day 6-7:   測試和驗證

Week 9: Phase 16 (性能優化)
  Day 1-2:   依賴審計
  Day 3-4:   Bundle 優化
  Day 5-6:   熱路徑優化
  Day 7:     基準測試和驗證
```

---

## 🔄 持續改進建議

### 自動化工具

#### 1. Pre-commit Hooks
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 類型檢查
bun run typecheck

# 測試受影響的文件
bun test --changed

# 檢查覆蓋率
bun test --coverage --coverage-threshold=80

# 檢查文檔完整性
bun run check:docs
```

#### 2. CI/CD 集成
```yaml
# .github/workflows/quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run typecheck:full

      - name: Test with coverage
        run: bun test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

      - name: Check documentation
        run: bun run check:docs

      - name: Bundle size check
        run: |
          bun run build
          bunx bundlesize
```

#### 3. 定期審計
```bash
# scripts/weekly-audit.sh
#!/bin/bash

echo "🔍 Running weekly code audit..."

# 1. 檢查新的 TODO
echo "\n📝 New TODOs:"
git diff HEAD~7 HEAD | grep "TODO\|FIXME" || echo "None"

# 2. 檢查新的 @ts-expect-error
echo "\n⚠️  New @ts-expect-error:"
git diff HEAD~7 HEAD | grep "@ts-expect-error" || echo "None"

# 3. 測試覆蓋率趨勢
echo "\n📊 Coverage trend:"
bun test --coverage --reporter=json > coverage-new.json
# Compare with previous week

# 4. Bundle 大小變化
echo "\n📦 Bundle size changes:"
bun run build
ls -lh packages/*/dist/*.js

# 5. 依賴更新
echo "\n📦 Outdated dependencies:"
bun update --dry-run

echo "\n✅ Audit complete!"
```

### Code Review Checklist

創建 PR 模板：
```markdown
## Description
<!-- Describe your changes -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Quality Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new TODOs without issues
- [ ] No new @ts-expect-error without comments
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Type checking passes
- [ ] No console.log in production code

## Performance Impact
- [ ] No performance regression
- [ ] Bundle size increase < 5KB (if applicable)

## Related Issues
Closes #
```

---

## 📚 參考資源

### 工具推薦
- **TypeDoc**: API 文檔生成
- **c8/Istanbul**: 測試覆蓋率
- **Bundlephobia**: 依賴大小分析
- **Bundle analyzer**: Bundle 可視化
- **Depcheck**: 未使用依賴檢查

### 最佳實踐文檔
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Bun Best Practices](https://bun.sh/docs)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [JSDoc Guide](https://jsdoc.app/)

---

## ✅ 完成檢查清單

### 每個 Phase 完成後：
- [ ] 代碼變更已提交
- [ ] 類型檢查通過
- [ ] 所有測試通過（包括新增測試）
- [ ] 文檔已更新
- [ ] PR 已創建並 review
- [ ] 更新本文檔狀態

### 全部完成後：
- [ ] 合併到 main
- [ ] 更新 CHANGELOG
- [ ] 標記版本（如適用）
- [ ] 發布公告（如有重大改進）
- [ ] 更新項目 README

---

**文檔維護者**: @Carl
**最後更新**: 2026-01-16
**版本**: 1.0.0
**狀態**: ✅ 規劃完成，可以開始實作

---

## 📝 附註

### 關於優先級
- **P1** (High): 影響核心功能或安全性，需立即處理
- **P2** (Medium): 改善開發體驗和代碼質量，建議在下個 sprint 處理
- **P3** (Low): 優化和改進，可以逐步進行

### 關於時間估算
所有時間估算基於：
- 中級開發者的平均速度
- 包含測試和文檔時間
- 包含 code review 時間
- 預留 20% 緩衝時間

實際時間可能因開發者經驗和代碼熟悉度而異。

### 獲取幫助
如有疑問或需要澄清，請：
1. 查看相關的 GitHub Issue
2. 參考 MIGRATION.md 和 CONTRIBUTING.md
3. 在團隊頻道詢問
4. 創建 RFC (Request for Comments) 討論重大變更
