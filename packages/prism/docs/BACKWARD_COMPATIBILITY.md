# 向下相容性指南 (Backward Compatibility Guide)

> **版本**: 3.0.2 → 3.1.0
> **嚴格程度**: 嚴格相容 (Strict Compatibility)
> **破壞性變更**: 0 個

---

## 🎯 相容性承諾

@gravito/prism v3.1.0 **嚴格遵守向下相容性**,確保:

1. ✅ **所有現有 API 完全不變**
2. ✅ **所有現有行為完全不變**
3. ✅ **所有導入路徑完全不變**
4. ✅ **所有預設設定完全不變**
5. ✅ **13 個依賴專案無需任何修改**

---

## 📜 相容性規則

### Rule 1: 公開 API 不得變更

**定義**: 公開 API 指任何可從 `@gravito/prism` 導入的類別、函數、介面。

#### ✅ 允許的變更

- **新增可選參數** (必須有預設值)
- **新增方法** (不影響現有方法)
- **新增類型** (擴展現有類型)
- **內部實作優化** (不改變行為)

#### ❌ 禁止的變更

- **移除公開方法**
- **重命名公開方法**
- **變更必要參數**
- **變更回傳值類型** (除非更寬鬆)
- **變更預設行為**

#### 範例

```typescript
// ✅ GOOD: 新增可選參數
class TemplateEngine {
  // v3.0.2
  constructor(viewsDir: string)

  // v3.1.0 - 新增可選參數
  constructor(viewsDir: string, cacheOptions?: CacheOptions)
}

// ❌ BAD: 變更必要參數
class TemplateEngine {
  // v3.0.2
  constructor(viewsDir: string)

  // ❌ 破壞性變更
  constructor(viewsDir: string, cacheOptions: CacheOptions)  // 不可選!
}

// ✅ GOOD: 新增方法
class StaticSiteGenerator {
  // v3.0.2
  export(outputDir: string, baseUrl?: string): Promise<void>

  // v3.1.0 - 新增方法
  exportIncremental(outputDir: string, options?: ExportOptions): Promise<void>
  exportDynamic(routes: DynamicRoute[], outputDir: string): Promise<void>
}

// ❌ BAD: 變更現有方法
class StaticSiteGenerator {
  // v3.0.2
  export(outputDir: string, baseUrl?: string): Promise<void>

  // ❌ 破壞性變更
  export(outputDir: string, options: ExportOptions): Promise<void>  // 參數變更!
}
```

---

### Rule 2: 預設行為不得變更

**定義**: 在未明確配置新功能時,所有行為必須與 v3.0.2 完全相同。

#### ✅ 允許的變更

- **新功能為 opt-in** (需明確啟用)
- **效能優化** (產生相同結果)
- **錯誤訊息改善** (不影響正常流程)

#### ❌ 禁止的變更

- **變更預設設定值**
- **變更輸出格式** (HTML、URL、路徑)
- **變更錯誤處理方式**

#### 範例

```typescript
// ✅ GOOD: 快取為 opt-in (預設啟用但可關閉,行為不變)
const engine1 = new TemplateEngine('./views')
// 行為: 與 v3.0.2 相同 (使用快取,但使用者感知不到)

const engine2 = new TemplateEngine('./views', { cache: { enabled: false } })
// 行為: 關閉快取 (opt-in 新功能)

// ✅ GOOD: 增量建置為 opt-in
const ssg = new StaticSiteGenerator(core)
await ssg.export('./dist')  // 預設: 全量建置 (與 v3.0.2 相同)
await ssg.exportIncremental('./dist', { incremental: true })  // 新功能: 增量建置

// ❌ BAD: 變更預設圖片格式
// v3.0.2
{{image src="/test.jpg"}}
// 輸出: <img src="/test.jpg" srcset="...">

// ❌ 破壞性變更
{{image src="/test.jpg"}}
// 輸出: <picture>...</picture>  // 格式改變!

// ✅ GOOD: 新格式為 opt-in
{{image src="/test.jpg" format="picture"}}
// 輸出: <picture>...</picture>  // 明確啟用
```

---

### Rule 3: 導入路徑不得變更

**定義**: 所有從 `@gravito/prism` 的導入路徑必須保持有效。

#### ✅ 允許的變更

- **新增導出** (新類別、新類型)
- **內部檔案重組** (只要 barrel exports 正確)

#### ❌ 禁止的變更

- **移除現有導出**
- **變更導出名稱**
- **破壞類型提示**

#### 範例

```typescript
// ✅ GOOD: 所有現有導入仍然有效
// v3.0.2
import { TemplateEngine, ImageService, StaticSiteGenerator } from '@gravito/prism'
import { Image as ReactImage } from '@gravito/prism/react'

// v3.1.0 - 相同導入仍然有效
import { TemplateEngine, ImageService, StaticSiteGenerator } from '@gravito/prism'
import { Image as ReactImage } from '@gravito/prism/react'

// v3.1.0 - 新增導出 (不破壞現有)
import { TemplateCache, IncrementalBuilder } from '@gravito/prism'

// ❌ BAD: 移除現有導出
// v3.0.2
import { StaticSiteGenerator } from '@gravito/prism'

// ❌ 破壞性變更
import { StaticSiteGenerator } from '@gravito/prism/ssg'  // 路徑變更!
```

---

### Rule 4: 類型定義向下相容

**定義**: TypeScript 類型必須保持相容,允許更寬鬆但不允許更嚴格。

#### ✅ 允許的類型變更

- **擴展介面** (新增可選屬性)
- **Union type 增加選項** (`type Foo = 'a' | 'b'` → `'a' | 'b' | 'c'`)
- **放寬限制** (`string` → `string | number`)

#### ❌ 禁止的類型變更

- **移除介面屬性**
- **必要屬性改為可選** (會破壞使用方的類型檢查)
- **收緊限制** (`string | number` → `string`)

#### 範例

```typescript
// ✅ GOOD: 擴展介面
// v3.0.2
interface ImageOptions {
  src: string
  alt?: string
  width?: number
  height?: number
}

// v3.1.0 - 新增可選屬性
interface ImageOptions {
  src: string
  alt?: string
  width?: number
  height?: number
  format?: 'img' | 'picture'     // ✅ 新增可選
  formats?: string[]              // ✅ 新增可選
  lqip?: boolean                  // ✅ 新增可選
  cdn?: string                    // ✅ 新增可選
}

// ❌ BAD: 移除屬性
// v3.0.2
interface RenderOptions {
  layout?: string
}

// ❌ 破壞性變更
interface RenderOptions {
  // layout 被移除!
}

// ❌ BAD: 必要屬性改可選
// v3.0.2
interface ImageOptions {
  src: string  // 必要
}

// ❌ 破壞性變更 (使用方的 `src` 檢查會失效)
interface ImageOptions {
  src?: string  // 改為可選
}
```

---

## 🧪 相容性測試策略

### 1. 單元測試保護

```typescript
// tests/backward-compatibility.test.ts
import { describe, expect, it } from 'bun:test'
import { TemplateEngine, ImageService, StaticSiteGenerator } from '@gravito/prism'

describe('Backward Compatibility - v3.0.2 APIs', () => {
  it('should support v3.0.2 TemplateEngine constructor', () => {
    // v3.0.2 用法
    const engine = new TemplateEngine('./views')
    expect(engine).toBeDefined()
  })

  it('should support v3.0.2 render method', () => {
    const engine = new TemplateEngine('./tests/fixtures')
    const result = engine.render('simple', { title: 'Test' })
    expect(result).toContain('Test')
  })

  it('should support v3.0.2 SSG export', async () => {
    const ssg = new StaticSiteGenerator(mockCore)
    // v3.0.2 用法
    await expect(ssg.export('./dist', 'https://example.com')).resolves.not.toThrow()
  })

  it('should support v3.0.2 image helper', () => {
    const engine = new TemplateEngine('./tests/fixtures')
    const result = engine.render('with-image', {})
    // 預設行為: <img> 元素
    expect(result).toContain('<img')
    expect(result).not.toContain('<picture')  // 不應使用新格式
  })
})
```

### 2. 整合測試 - 依賴專案

在至少 3 個依賴專案測試:

```bash
# 1. @gravito/satellite-catalog
cd packages/satellite-catalog
bun test

# 2. @gravito/admin-shell-react
cd packages/admin-shell-react
bun test

# 3. examples/commerce-fullstack
cd examples/commerce-fullstack
bun test
```

### 3. 類型測試

```typescript
// tests/type-compatibility.test.ts
import { describe, expect, it } from 'bun:test'
import type { ImageOptions, RenderOptions } from '@gravito/prism'

describe('Type Compatibility', () => {
  it('should accept v3.0.2 ImageOptions', () => {
    // v3.0.2 用法
    const options: ImageOptions = {
      src: '/test.jpg',
      alt: 'Test',
      width: 800,
      height: 600
    }
    expect(options.src).toBe('/test.jpg')
  })

  it('should accept v3.1.0 extended ImageOptions', () => {
    // v3.1.0 新功能
    const options: ImageOptions = {
      src: '/test.jpg',
      alt: 'Test',
      width: 800,
      height: 600,
      format: 'picture',    // ✅ 新增
      formats: ['avif', 'webp'],  // ✅ 新增
      lqip: true            // ✅ 新增
    }
    expect(options.format).toBe('picture')
  })
})
```

### 4. 快照測試 (Snapshot Testing)

```typescript
// tests/output-compatibility.test.ts
import { describe, expect, it } from 'bun:test'
import { TemplateEngine } from '@gravito/prism'

describe('Output Compatibility', () => {
  it('should produce same HTML output as v3.0.2', () => {
    const engine = new TemplateEngine('./tests/fixtures')
    const result = engine.render('example', { title: 'Test', count: 5 })

    // 使用快照確保輸出不變
    expect(result).toMatchSnapshot()
  })

  it('should produce same image HTML as v3.0.2', () => {
    const engine = new TemplateEngine('./tests/fixtures')
    const result = engine.render('with-image', {})

    // 確保預設行為 (不使用新功能)
    expect(result).toMatchSnapshot()
  })
})
```

---

## 🔄 Deprecation 策略 (棄用策略)

若未來需要移除 API,遵循以下流程:

### 階段 1: 標記為 Deprecated (v3.1.0)

```typescript
/**
 * @deprecated Use `exportIncremental()` instead. Will be removed in v4.0.0.
 */
export async function legacyExport(): Promise<void> {
  console.warn('[Deprecation] legacyExport() is deprecated. Use exportIncremental() instead.')
  // ... 原有實作
}
```

### 階段 2: 保留至少 2 個 minor 版本

- v3.1.0: 標記 deprecated
- v3.2.0: 仍保留
- v3.3.0: 仍保留
- v4.0.0: 可移除 (major version bump)

### 階段 3: 提供遷移指南

```markdown
# Migration from v3.x to v4.0

## Removed APIs

### `legacyExport()` → `exportIncremental()`

**Before (v3.x)**:
```typescript
await ssg.legacyExport('./dist')
```

**After (v4.0)**:
```typescript
await ssg.exportIncremental('./dist', { incremental: true })
```
```

---

## 📊 相容性檢查清單

發布前必須通過以下檢查:

### API 相容性 ✅

- [ ] 所有 v3.0.2 公開 API 仍可用
- [ ] 所有 v3.0.2 導入路徑有效
- [ ] 所有 v3.0.2 類型定義相容
- [ ] 無破壞性變更

### 行為相容性 ✅

- [ ] 預設行為完全相同
- [ ] 輸出格式完全相同
- [ ] 錯誤處理方式相同
- [ ] 新功能為 opt-in

### 測試相容性 ✅

- [ ] 所有現有測試通過
- [ ] 新增向下相容性測試通過
- [ ] 依賴專案測試通過 (至少 3 個)
- [ ] 快照測試通過

### 類型相容性 ✅

- [ ] TypeScript 編譯通過
- [ ] 類型提示正常
- [ ] 無類型破壞性變更
- [ ] 擴展類型向下相容

---

## 🚨 破壞性變更處理

### 如果發現破壞性變更

1. **立即停止發布流程**
2. **評估影響範圍**
   - 有多少依賴專案受影響?
   - 是否有替代方案?
3. **決策**:
   - **選項 A**: 回滾變更,重新設計
   - **選項 B**: 提供 adapter/wrapper 保持相容
   - **選項 C**: 推遲到 v4.0.0 (major version)
4. **通知使用者** (如已發布)

### 範例: Adapter Pattern

```typescript
// 若新實作無法保持完全相容,提供 adapter

// 新實作 (內部)
class NewTemplateEngine {
  constructor(config: NewConfig) { /* ... */ }
}

// 相容層 (公開 API)
export class TemplateEngine {
  private engine: NewTemplateEngine

  // v3.0.2 相容構造函數
  constructor(viewsDir: string, cacheOptions?: CacheOptions) {
    // 轉換為新格式
    const newConfig = this.adaptConfig(viewsDir, cacheOptions)
    this.engine = new NewTemplateEngine(newConfig)
  }

  private adaptConfig(viewsDir: string, cacheOptions?: CacheOptions): NewConfig {
    return {
      viewsDir,
      cache: cacheOptions ?? { enabled: true }
    }
  }

  // 所有公開方法委託給新實作
  render(view: string, data: Record<string, unknown> = {}): string {
    return this.engine.render(view, data)
  }
}
```

---

## 📚 相容性測試執行

### 本地測試

```bash
# 1. 執行所有測試
bun test

# 2. 執行相容性專用測試
bun test tests/backward-compatibility.test.ts
bun test tests/type-compatibility.test.ts
bun test tests/output-compatibility.test.ts

# 3. 類型檢查
bun run typecheck

# 4. 在依賴專案測試
cd ../satellite-catalog && bun test
cd ../admin-shell-react && bun test
cd ../../examples/commerce-fullstack && bun test
```

### CI 測試

```yaml
# .github/workflows/compatibility.yml
name: Backward Compatibility

on: [pull_request]

jobs:
  compatibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run compatibility tests
        run: bun test tests/backward-compatibility.test.ts

      - name: Test dependent packages
        run: |
          cd packages/satellite-catalog && bun test
          cd packages/admin-shell-react && bun test
          cd examples/commerce-fullstack && bun test
```

---

## 📖 使用者溝通

### CHANGELOG 範例

```markdown
# [3.1.0] - 2026-01-XX

## ✅ Backward Compatibility Guaranteed

**This release is 100% backward compatible with v3.0.2.**

All existing code will continue to work without any modifications.
New features are opt-in and do not affect default behavior.

## Added (New Features - Opt-in)
- Template caching with configurable options
- AVIF/WebP support (enable with `format="picture"`)
- Incremental SSG builds (use `exportIncremental()`)
- Dynamic route generation

## Changed (Internal Only - No User Impact)
- Refactored internal architecture for better performance
- Optimized regex parsing (30% faster)

## Migration Guide
**No migration needed.** All v3.0.2 code works as-is.

To enable new features, see [MIGRATION.md](./MIGRATION.md).
```

### README 更新

```markdown
## Installation

```bash
bun add @gravito/prism
```

## Upgrading from v3.0.x

v3.1.0 is **100% backward compatible**. Simply update:

```bash
bun update @gravito/prism
```

All existing code continues to work. New features are opt-in.
```

---

## ✅ 相容性驗收

發布前必須確認:

- [ ] ✅ **API 相容性**: 所有 v3.0.2 API 可用
- [ ] ✅ **行為相容性**: 預設行為不變
- [ ] ✅ **類型相容性**: TypeScript 相容
- [ ] ✅ **測試相容性**: 所有測試通過
- [ ] ✅ **依賴專案**: 至少 3 個專案測試通過
- [ ] ✅ **文檔**: CHANGELOG、README、MIGRATION.md 完整

---

**上一文檔**: [← 驗收標準](./ACCEPTANCE_CRITERIA.md)
**回到總覽**: [總覽文檔](./PRISM_OPTIMIZATION_OVERVIEW.md)
