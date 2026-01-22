# Phase 5: 架構重構

> **目標**: 模組化重構、提取編譯器邏輯、AST 解析探索
> **預估工時**: 5-7 天
> **向下相容**: ✅ 內部重構,公開 API 不變

---

## 📋 任務清單

### 5.1 目錄結構重組

**目標**: 將扁平結構改為分層架構
**向下相容**: ✅ 內部重組,導出路徑不變

#### 現狀結構

```
packages/prism/src/
├── TemplateEngine.ts        (500+ lines, 多職責)
├── ImageService.ts           (312 lines)
├── SSG.ts                    (191 lines)
├── components/
│   ├── react.tsx
│   └── vue.ts
└── index.ts                  (Barrel exports)
```

#### 目標結構

```
packages/prism/src/
├── core/
│   ├── TemplateCache.ts       (Phase 1 已新增)
│   ├── TemplateCompiler.ts    (從 TemplateEngine 提取)
│   ├── TemplateParser.ts      (新增 - 語法解析)
│   └── TemplateRenderer.ts    (新增 - 渲染邏輯)
├── engine/
│   └── TemplateEngine.ts      (重構後 - 編排層)
├── image/
│   ├── ImageService.ts        (現有,移至此處)
│   ├── ImageCDNLoader.ts      (Phase 2 新增)
│   ├── ImagePlaceholder.ts    (Phase 2 新增)
│   └── loaders/               (Phase 2 新增)
│       ├── cloudinary.ts
│       ├── imgix.ts
│       └── vercel.ts
├── ssg/
│   ├── StaticSiteGenerator.ts (SSG.ts 重命名)
│   ├── IncrementalBuilder.ts  (Phase 4 新增)
│   └── DynamicRouteResolver.ts (Phase 4 新增)
├── components/
│   ├── react.tsx              (現有)
│   └── vue.ts                 (現有)
├── types/
│   ├── template.ts            (類型定義統一管理)
│   ├── image.ts
│   └── ssg.ts
└── index.ts                   (重新導出,保持 API 不變)
```

#### 遷移步驟

```bash
# Step 1: 建立新目錄
mkdir -p src/core src/engine src/image src/ssg src/types

# Step 2: 移動現有檔案
mv src/TemplateEngine.ts src/engine/TemplateEngine.ts
mv src/ImageService.ts src/image/ImageService.ts
mv src/SSG.ts src/ssg/StaticSiteGenerator.ts

# Step 3: 更新 barrel exports (src/index.ts)
# 確保所有公開 API 從新路徑導出

# Step 4: 執行測試,確保無破壞性變更
bun test
```

#### 驗收標準

- [ ] 所有現有測試通過
- [ ] 公開 API 導入路徑不變 (`import { TemplateEngine } from '@gravito/prism'`)
- [ ] `bun run typecheck` 無錯誤
- [ ] 無循環依賴 (可用 `madge --circular src`)

---

### 5.2 提取 `TemplateCompiler` 類別

**檔案**: `src/core/TemplateCompiler.ts` (新)
**向下相容**: ✅ 內部實作,外部不可見

#### 職責分離

| 現狀 (TemplateEngine) | 分離後 |
|---------------------|--------|
| 檔案讀取 | → `TemplateEngine` (編排層) |
| 模板編譯 | → `TemplateCompiler` (編譯層) |
| 變數解析 | → `TemplateParser` (解析層) |
| 指令處理 | → `TemplateCompiler` (編譯層) |
| HTML 輸出 | → `TemplateRenderer` (渲染層) |

#### 實作規格

```typescript
/**
 * TemplateCompiler - Template compilation logic
 *
 * Responsibilities:
 * - Compile template source to executable function
 * - Process directives (@if, @foreach, @section)
 * - Handle component tags
 * - Manage includes and layouts
 */
import type { RenderContext } from '../types/template'

export interface CompilerOptions {
  strict?: boolean       // Strict mode - throw on undefined vars
  debug?: boolean        // Debug mode - add source maps
  helpers?: Map<string, HelperFunction>
}

export class TemplateCompiler {
  constructor(private options: CompilerOptions = {}) {}

  /**
   * Compile template source to render function
   */
  compile(source: string, context: RenderContext): CompiledTemplate {
    // Step 1: Pre-process (extract sections, stacks)
    const preprocessed = this.preprocess(source, context)

    // Step 2: Process directives
    let compiled = this.processDirectives(preprocessed, context)

    // Step 3: Process components
    compiled = this.processComponents(compiled, context)

    // Step 4: Process helpers
    compiled = this.processHelpers(compiled, context)

    // Step 5: Process variables
    compiled = this.processVariables(compiled)

    return {
      source: compiled,
      dependencies: this.extractDependencies(source),
      metadata: {
        hasConditionals: /\@if/.test(source),
        hasLoops: /\@foreach/.test(source),
        hasComponents: /<x-\w+/.test(source)
      }
    }
  }

  /**
   * Pre-process: extract sections and stacks
   */
  private preprocess(source: string, context: RenderContext): string {
    let result = source

    // Extract @section directives
    for (const match of result.matchAll(SECTION_REGEX)) {
      const name = match[1]
      const content = match[2]
      if (name && content) {
        context.sections.set(name, content.trim())
      }
    }

    // Extract @push directives
    for (const match of result.matchAll(PUSH_REGEX)) {
      const name = match[1]
      const content = match[2]
      if (name && content) {
        if (!context.stacks.has(name)) {
          context.stacks.set(name, [])
        }
        context.stacks.get(name)?.push(content.trim())
      }
    }

    // Remove @push tags from output
    result = result.replace(PUSH_REGEX, '')

    return result
  }

  /**
   * Process directives (@if, @foreach, etc.)
   */
  private processDirectives(source: string, context: RenderContext): string {
    let result = source

    // @if / @elseif / @else / @endif
    result = this.processConditionals(result)

    // @foreach / @endforeach
    result = this.processLoops(result)

    // @yield / @section
    result = this.processSections(result, context)

    // @stack
    result = this.processStacks(result, context)

    // @include
    result = this.processIncludes(result)

    return result
  }

  /**
   * Process conditionals - extracted from TemplateEngine
   */
  private processConditionals(source: string): string {
    // Use existing regex-based implementation
    // Or: Replace with AST-based parsing (Phase 5 探索)
    return source.replace(
      /@if\s*\((.*?)\)([\s\S]*?)(?:@elseif\s*\((.*?)\)([\s\S]*?))*(?:@else([\s\S]*?))?@endif/g,
      (match, condition, ifBody, elseIfCond, elseIfBody, elseBody) => {
        // Compile to JavaScript
        return `{{#if ${condition}}}${ifBody}{{else}}${elseBody || ''}{{/if}}`
      }
    )
  }

  /**
   * Process loops - extracted from TemplateEngine
   */
  private processLoops(source: string): string {
    return source.replace(
      /@foreach\s*\((.*?)\s+as\s+(\w+)(?:\s*,\s*(\w+))?\)([\s\S]*?)@endforeach/g,
      (match, array, value, key, body) => {
        // Compile to loop
        return `{{#each ${array} as ${value}${key ? `, ${key}` : ''}}}${body}{{/each}}`
      }
    )
  }

  /**
   * Process sections (@yield, @section)
   */
  private processSections(source: string, context: RenderContext): string {
    let result = source

    // Replace @yield with section content
    for (const match of result.matchAll(YIELD_REGEX)) {
      const name = match[1]
      const fallback = match[2] || ''
      const content = context.sections.get(name) || fallback
      result = result.replace(match[0], content)
    }

    // Remove @section tags (already extracted)
    result = result.replace(SECTION_REGEX, '')

    return result
  }

  /**
   * Process stacks (@stack)
   */
  private processStacks(source: string, context: RenderContext): string {
    let result = source

    for (const match of result.matchAll(STACK_REGEX)) {
      const name = match[1]
      const content = context.stacks.get(name)?.join('\n') || ''
      result = result.replace(match[0], content)
    }

    return result
  }

  /**
   * Process includes (@include)
   */
  private processIncludes(source: string): string {
    // Note: Includes require file I/O, handled by TemplateEngine
    return source
  }

  /**
   * Process components (<x-name>)
   */
  private processComponents(source: string, context: RenderContext): string {
    // Use tokenizer from Phase 1
    const tokens = this.tokenizeComponents(source)
    
    // ... component processing logic
    return source
  }

  /**
   * Process helpers ({{helper arg1=val1}})
   */
  private processHelpers(source: string, context: RenderContext): string {
    const helpers = this.options.helpers || new Map()

    return source.replace(HELPER_REGEX, (match, helperName, argsString) => {
      const helper = helpers.get(helperName)
      if (!helper) {
        return match // Keep original if helper not found
      }

      const args = this.parseHelperArgs(argsString)
      return helper(args)
    })
  }

  /**
   * Process variables ({{varName}})
   */
  private processVariables(source: string): string {
    return source.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
      const trimmed = expr.trim()
      // Evaluate expression safely
      return `{{${trimmed}}}`
    })
  }

  /**
   * Extract dependencies (included templates)
   */
  private extractDependencies(source: string): string[] {
    const deps: string[] = []

    for (const match of source.matchAll(INCLUDE_REGEX)) {
      const name = match[1]
      if (name) deps.push(name)
    }

    for (const match of source.matchAll(EXTENDS_REGEX)) {
      const name = match[1]
      if (name) deps.push(name)
    }

    return deps
  }

  // ... helper methods (tokenizeComponents, parseHelperArgs, etc.)
}
```

#### 驗收標準

- [ ] `TemplateCompiler` 類別實作完成
- [ ] `TemplateEngine` 重構為使用 `TemplateCompiler`
- [ ] 所有指令處理邏輯正確遷移
- [ ] 現有測試全部通過
- [ ] 職責清晰分離

---

### 5.3 提取 `TemplateParser` 類別 (可選 - AST 探索)

**檔案**: `src/core/TemplateParser.ts` (新)
**向下相容**: ✅ 內部實作,可選功能

#### 實作規格 (AST-based 解析探索)

```typescript
/**
 * TemplateParser - AST-based template parsing (EXPERIMENTAL)
 *
 * This is an experimental parser for future versions.
 * Current version still uses regex-based parsing.
 *
 * Benefits of AST:
 * - Better error messages with line/column info
 * - Easier to add new directives
 * - More robust nested structure handling
 * - Potential for optimization passes
 *
 * Drawbacks:
 * - More complex implementation
 * - Potentially slower for simple templates
 * - Requires complete rewrite of compilation
 */

export enum NodeType {
  Text = 'Text',
  Variable = 'Variable',
  Directive = 'Directive',
  Component = 'Component',
  Helper = 'Helper'
}

export interface ASTNode {
  type: NodeType
  start: number
  end: number
  children?: ASTNode[]
}

export interface TextNode extends ASTNode {
  type: NodeType.Text
  content: string
}

export interface VariableNode extends ASTNode {
  type: NodeType.Variable
  name: string
  filters?: string[]
}

export interface DirectiveNode extends ASTNode {
  type: NodeType.Directive
  name: string           // 'if', 'foreach', 'section'
  args: string[]
  body: ASTNode[]
  alternate?: ASTNode[]  // for @else
}

export interface ComponentNode extends ASTNode {
  type: NodeType.Component
  name: string
  props: Record<string, unknown>
  children: ASTNode[]
}

export class TemplateParser {
  private source: string
  private index: number = 0

  constructor(source: string) {
    this.source = source
  }

  /**
   * Parse template to AST
   */
  parse(): ASTNode[] {
    const nodes: ASTNode[] = []

    while (this.index < this.source.length) {
      const node = this.parseNext()
      if (node) nodes.push(node)
    }

    return nodes
  }

  /**
   * Parse next node
   */
  private parseNext(): ASTNode | null {
    // Try directive
    if (this.peek() === '@') {
      return this.parseDirective()
    }

    // Try component
    if (this.peek(2) === '<x') {
      return this.parseComponent()
    }

    // Try variable
    if (this.peek(2) === '{{') {
      return this.parseVariable()
    }

    // Default: text
    return this.parseText()
  }

  /**
   * Parse directive (@if, @foreach, etc.)
   */
  private parseDirective(): DirectiveNode | null {
    const start = this.index
    this.consume('@')

    const name = this.consumeWhile(/[a-z]/)
    
    // ... parse args and body

    return {
      type: NodeType.Directive,
      name,
      args: [],
      body: [],
      start,
      end: this.index
    }
  }

  // ... other parsing methods

  private peek(n: number = 1): string {
    return this.source.substring(this.index, this.index + n)
  }

  private consume(expected: string): void {
    if (this.peek(expected.length) !== expected) {
      throw new Error(`Expected "${expected}" at position ${this.index}`)
    }
    this.index += expected.length
  }

  private consumeWhile(regex: RegExp): string {
    let result = ''
    while (this.index < this.source.length && regex.test(this.source[this.index])) {
      result += this.source[this.index]
      this.index++
    }
    return result
  }
}
```

#### 決策點

**選項 A**: 保持 Regex-based (Phase 5 不實作 AST)
- ✅ 簡單、快速
- ✅ 已驗證可靠
- ❌ 錯誤訊息品質較差
- ❌ 難以擴展新語法

**選項 B**: 實作 AST-based (Phase 5 實作)
- ✅ 更好的錯誤訊息
- ✅ 易於擴展
- ✅ 更強的類型安全
- ❌ 開發成本高 (額外 3-5 天)
- ❌ 需要全面測試

**建議**: **選項 A** - 保持 Regex,將 AST 推遲到 v4.0.0

#### 驗收標準 (若實作 AST)

- [ ] `TemplateParser` 正確解析所有指令
- [ ] AST 節點類型完整
- [ ] 與現有 Regex 實作產生相同輸出
- [ ] 效能測試無明顯退化

---

### 5.4 更新 `index.ts` Barrel Exports

**檔案**: `src/index.ts`
**向下相容**: ✅ CRITICAL - 必須保持導入路徑不變

#### 重構前

```typescript
export { TemplateEngine } from './TemplateEngine'
export { ImageService } from './ImageService'
export { StaticSiteGenerator } from './SSG'
export { OrbitPrism } from './orbit'
```

#### 重構後

```typescript
// Core exports (向下相容)
export { TemplateEngine } from './engine/TemplateEngine'
export { ImageService } from './image/ImageService'
export { StaticSiteGenerator } from './ssg/StaticSiteGenerator'
export { OrbitPrism } from './orbit'

// New exports (Phase 1-4 新增)
export { TemplateCache } from './core/TemplateCache'
export type { CacheOptions, CacheStats } from './core/TemplateCache'

export { IncrementalBuilder } from './ssg/IncrementalBuilder'
export { DynamicRouteResolver } from './ssg/DynamicRouteResolver'
export type { DynamicRoute, ResolvedRoute } from './ssg/DynamicRouteResolver'

export { ImageCDNLoader } from './image/ImageCDNLoader'
export { ImagePlaceholder } from './image/ImagePlaceholder'
export type { CDNLoaderOptions, PlaceholderOptions } from './image/types'

// Internal exports (僅供進階使用)
export { TemplateCompiler } from './core/TemplateCompiler'
export type { CompilerOptions } from './core/TemplateCompiler'

// Type re-exports
export type {
  RenderContext,
  RenderOptions,
  HelperFunction,
  ImageOptions,
  ExportOptions,
  SSGOptions
} from './types'

// React/Vue components
export { Image as ReactImage } from './components/react'
export { Image as VueImage } from './components/vue'
```

#### 驗收標準

- [ ] `import { TemplateEngine } from '@gravito/prism'` 仍然正常
- [ ] 所有依賴專案無需修改導入路徑
- [ ] `bun run typecheck` 通過
- [ ] 類型提示正常運作

---

### 5.5 更新類型定義統一管理

**檔案**: `src/types/` (新目錄)
**向下相容**: ✅ 類型提取,不影響使用

#### 類型檔案結構

```
src/types/
├── template.ts        # TemplateEngine 相關類型
├── image.ts           # ImageService 相關類型
├── ssg.ts             # SSG 相關類型
├── cache.ts           # Cache 相關類型
└── index.ts           # 統一導出
```

#### `src/types/template.ts`

```typescript
/**
 * Template engine type definitions
 */

export interface RenderContext {
  sections: Map<string, string>
  stacks: Map<string, string[]>
}

export interface RenderOptions {
  layout?: string
  [key: string]: unknown
}

export type HelperFunction = (args: Record<string, any>) => string

export interface CompiledTemplate {
  source: string
  dependencies: string[]
  metadata: {
    hasConditionals: boolean
    hasLoops: boolean
    hasComponents: boolean
  }
}
```

#### `src/types/index.ts`

```typescript
export * from './template'
export * from './image'
export * from './ssg'
export * from './cache'
```

#### 驗收標準

- [ ] 所有類型統一從 `src/types` 導出
- [ ] 無重複類型定義
- [ ] 類型導入無循環依賴
- [ ] `bun run typecheck` 通過

---

### 5.6 更新文檔與範例

**檔案**: `README.md`, `docs/` (新)
**向下相容**: ✅ 文檔更新,不影響程式碼

#### 新增文檔

```
packages/prism/
├── README.md                     (更新)
├── CHANGELOG.md                  (新增)
└── docs/
    ├── API.md                    (API 參考)
    ├── MIGRATION.md              (從 v3.0 遷移)
    ├── CACHING.md                (快取指南)
    ├── SSG.md                    (SSG 使用指南)
    ├── IMAGES.md                 (圖片優化指南)
    └── ARCHITECTURE.md           (架構說明)
```

#### `CHANGELOG.md`

```markdown
# Changelog

## [3.1.0] - 2026-01-XX

### Added
- 🚀 Template caching with LRU eviction (30% performance improvement)
- 🖼️ AVIF/WebP support with `<picture>` element generation
- 📊 LQIP (Low-Quality Image Placeholder) utilities
- 🔌 Pluggable CDN loaders (Cloudinary, imgix, Vercel)
- ⚡ Incremental SSG builds with manifest tracking
- 🔀 Dynamic route generation (`[slug]`, `[...path]`)
- 🔧 Configurable concurrency and timeout for SSG

### Changed
- ♻️ Refactored internal architecture for better maintainability
- 📦 Reorganized directory structure (internal only)
- 🔍 Improved error messages and debugging support

### Fixed
- ✅ Fixed 4 LSP warnings (`noAssignInExpressions`, `noNonNullAssertion`)
- 🐛 Improved component tokenizer performance (deep nesting)

### Performance
- ⚡ +30% template rendering speed (with cache)
- 📉 Reduced regex-based parsing overhead
- 🚀 Faster component parsing for deeply nested structures

## [3.0.2] - Previous Version
...
```

#### 驗收標準

- [ ] `README.md` 更新完成
- [ ] `CHANGELOG.md` 記錄所有變更
- [ ] API 文檔完整
- [ ] 遷移指南清晰

---

## 📊 預期成果

### 程式碼品質改善

| 指標 | 現狀 | 目標 |
|------|------|------|
| 單檔行數 | 500+ lines | <300 lines |
| 職責分離 | 單一大類別 | 多個小類別 |
| 循環依賴 | 未檢查 | 0 個 |
| 類型覆蓋 | 部分 | 100% |

### 架構改善

| 指標 | 現狀 | 目標 |
|------|------|------|
| 目錄層級 | 扁平 (2 層) | 分層 (3-4 層) |
| 模組耦合 | 中等 | 低 |
| 可測試性 | 中等 | 高 |
| 可擴展性 | 中等 | 高 |

---

## ✅ 驗收檢查清單

完成 Phase 5 後,請檢查:

### 功能驗收

- [ ] 目錄結構重組完成
- [ ] `TemplateCompiler` 提取完成
- [ ] `TemplateParser` 實作完成 (若選擇實作)
- [ ] Barrel exports 更新完成
- [ ] 類型定義統一管理
- [ ] 文檔更新完成

### 測試驗收

- [ ] 所有現有測試通過 (33+ 測試)
- [ ] 新增架構測試通過
- [ ] 測試覆蓋率 >85%
- [ ] 無循環依賴 (`madge --circular src`)

### LSP 驗收

- [ ] `bun run typecheck` 無錯誤
- [ ] 無新警告產生
- [ ] 類型提示正常運作

### 相容性驗收

- [ ] 所有公開 API 導入路徑不變
- [ ] 現有專案無需修改
- [ ] 所有依賴專案測試通過
- [ ] 版本號正確 (3.1.0)

### 文檔驗收

- [ ] README 更新完成
- [ ] CHANGELOG 完整
- [ ] API 文檔齊全
- [ ] 遷移指南清晰

### 發布前檢查

- [ ] `package.json` 版本號更新為 3.1.0
- [ ] `peerDependencies` 檢查
- [ ] `exports` 欄位正確
- [ ] `bun run build` 成功
- [ ] `bun test` 全部通過
- [ ] Git tags 建立

---

## 🚀 發布流程

### 1. 版本更新

```bash
# packages/prism/package.json
{
  "name": "@gravito/prism",
  "version": "3.1.0",  # 從 3.0.2 升級
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./react": "./src/components/react.tsx",
    "./vue": "./src/components/vue.ts"
  }
}
```

### 2. 建置與測試

```bash
# 完整測試
bun test
bun test --coverage

# 類型檢查
bun run typecheck

# 循環依賴檢查
bunx madge --circular src

# 建置 (如果有)
bun run build
```

### 3. Git 標記

```bash
git tag -a v3.1.0 -m "Release v3.1.0: Performance & Features"
git push origin v3.1.0
```

### 4. 發布到 npm (可選)

```bash
npm publish --access public
```

---

## 🔄 AST 解析決策 (重要)

### 決策問題

**是否在 Phase 5 實作 AST-based 解析?**

### 選項比較

| 考量 | Regex-based | AST-based |
|------|------------|-----------|
| **開發時間** | 0 天 (已有) | +3-5 天 |
| **效能** | 快 (簡單模板) | 慢 (複雜解析) |
| **錯誤訊息** | 基本 | 優秀 (行/列) |
| **可維護性** | 中 | 高 |
| **擴展性** | 難 | 易 |
| **風險** | 低 | 中 (需大量測試) |

### 建議決策

**推薦**: **Phase 5 不實作 AST,推遲到 v4.0.0**

**理由**:
1. ✅ 現有 Regex 實作已穩定運作
2. ✅ Phase 1-4 已達成 30% 效能提升目標
3. ✅ AST 需要額外 3-5 天開發 + 測試
4. ✅ 向下相容性風險較高
5. ✅ v3.1.0 已有足夠價值 (快取、圖片、SSG)

**替代方案**:
- 在 `src/core/TemplateParser.ts` 建立檔案框架
- 新增 `// TODO: v4.0.0 - AST-based parsing` 註解
- 撰寫設計文檔 (`docs/ARCHITECTURE.md`)
- 留待 v4.0.0 major version 實作

---

## 📚 參考資料

- [Handlebars AST Structure](https://github.com/handlebars-lang/handlebars.js/blob/master/docs/compiler-api.md)
- [Acorn JavaScript Parser](https://github.com/acornjs/acorn)
- [Laravel Blade Compiler](https://github.com/laravel/framework/blob/10.x/src/Illuminate/View/Compilers/BladeCompiler.php)
- [Circular Dependency Detection (madge)](https://github.com/pahen/madge)

---

**上一文檔**: [← Phase 4: SSG 增強](./PHASE4_SSG_ENHANCEMENT.md)
**下一文檔**: [驗收標準](./ACCEPTANCE_CRITERIA.md) →
