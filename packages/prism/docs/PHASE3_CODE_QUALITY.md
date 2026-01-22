# Phase 3: 程式碼品質改善

> **目標**: 修復 LSP 警告、改善類型安全、提升測試覆蓋
> **預估工時**: 1-2 天
> **向下相容**: ✅ 全部內部重構

---

## 📋 任務清單

### 3.1 修復 `noAssignInExpressions` 警告

**檔案**: `src/TemplateEngine.ts`
**向下相容**: ✅ 內部重構

#### 現狀檢查

```typescript
// L173, L185, L303 - LSP 警告
while ((match = SECTION_REGEX.exec(template)) !== null) {
  // ...
}
```

#### 修復方案

已在 Phase 1.3 修復（使用 `matchAll`），此處確認：

```typescript
// ✅ 修復後：使用 matchAll
for (const match of template.matchAll(SECTION_REGEX)) {
  const name = match[1]
  const content = match[2]
  // ...
}
```

#### 驗收標準

- [ ] L173 警告消失
- [ ] L185 警告消失
- [ ] L303 警告消失
- [ ] `bun run typecheck` 無此類警告

---

### 3.2 修復 `noNonNullAssertion` 警告

**檔案**: `src/TemplateEngine.ts`
**向下相容**: ✅ 內部重構

#### 現狀檢查

```typescript
// L236 - 使用非空斷言
const startIndex = startTagMatch.index!
```

#### 修復方案

```typescript
// 改進前
const startIndex = startTagMatch.index!

// 改進後：使用 guard
const startIndex = startTagMatch.index
if (startIndex === undefined) {
  // Should never happen with successful match, but TypeScript doesn't know
  throw new Error('Match index is undefined')
}
```

或使用 optional chaining + default:

```typescript
const startIndex = startTagMatch.index ?? 0
```

#### 完整修復

```typescript
private processComponents(
  template: string,
  data: Record<string, unknown>,
  ctx: RenderContext,
  depth = 0
): string {
  if (depth > 10) {
    throw new Error('Maximum component depth exceeded')
  }

  let result = template
  let hasComponent = true

  while (hasComponent) {
    const startTagMatch = result.match(COMPONENT_TAG_REGEX)
    if (!startTagMatch) {
      hasComponent = false
      break
    }

    const tagName = startTagMatch[1]
    const attrsString = startTagMatch[2]
    
    // 修復：使用 guard 代替非空斷言
    const startIndex = startTagMatch.index
    if (startIndex === undefined) {
      // This should never happen with a successful match
      throw new Error('Component match index is undefined')
    }
    
    const contentStartIndex = startIndex + startTagMatch[0].length

    // ... rest of the method
  }

  return result
}
```

#### 驗收標準

- [ ] L236 警告消失
- [ ] 無新的非空斷言警告
- [ ] 邏輯正確性不變

---

### 3.3 改善 SSG 類型定義

**檔案**: `src/SSG.ts`
**向下相容**: ✅ 內部重構

#### 現狀檢查

```typescript
// 問題：使用 any 類型
let routes: any[] = []
const router = this.core.router as any
```

#### 修復方案

```typescript
/**
 * SSG Route interface
 */
interface SSGRoute {
  path: string
  method: string
}

/**
 * Router with route access methods
 */
interface RouterWithRoutes {
  routes?: SSGRoute[]
  getRoutes?(): SSGRoute[]
}

export class StaticSiteGenerator {
  constructor(private core: PlanetCore) {}

  async export(
    outputDir: string,
    baseUrl = 'https://gravito.dev',
    extraPaths: string[] = []
  ): Promise<void> {
    this.core.logger.info(`[SSG] Starting static export to: ${outputDir}`)

    // 改進：明確類型
    const router = this.core.router as RouterWithRoutes
    let routes: SSGRoute[] = []

    if (Array.isArray(router.routes)) {
      routes = router.routes
    } else if (typeof router.getRoutes === 'function') {
      routes = router.getRoutes()
    } else {
      this.core.logger.warn('[SSG] Could not detect routes. SSG might fail.')
    }

    // 去重
    const uniquePaths = new Set<string>()
    const uniqueRoutes: SSGRoute[] = []

    const addRoute = (r: SSGRoute | { path: string; method?: string }) => {
      if (r?.path && !uniquePaths.has(r.path)) {
        uniquePaths.add(r.path)
        uniqueRoutes.push({
          path: r.path,
          method: r.method ?? 'GET'
        })
      }
    }

    // 處理 router routes
    if (Array.isArray(routes)) {
      routes
        .filter(
          (r) =>
            r?.method &&
            r.method.toLowerCase() === 'get' &&
            r.path &&
            !r.path.includes(':') &&
            !r.path.includes('*')
        )
        .forEach(addRoute)
    }

    // 處理額外路徑
    extraPaths.forEach((path) => {
      if (path) addRoute({ path, method: 'GET' })
    })

    // ... rest of the method
  }
}
```

#### 驗收標準

- [ ] 無 `any` 類型
- [ ] TypeScript strict mode 通過
- [ ] 邏輯正確性不變

---

### 3.4 增加測試覆蓋到 >85%

**檔案**: `tests/*.test.ts`
**向下相容**: ✅ 新增測試

#### 現狀檢查

```
File                      | % Funcs | % Lines |
--------------------------|---------|---------|
All files                 |   92.59 |   99.08 |
src/ImageService.ts       |   90.91 |   97.35 | L167-168 未覆蓋
src/TemplateEngine.ts     |   97.06 |   99.67 |
src/components/Image.tsx  |  100.00 |  100.00 |
src/helpers/image.ts      |  100.00 |   98.36 |
src/index.ts              |   75.00 |  100.00 | 函數覆蓋率低
```

#### 改進方案

**新增測試檔案**：

1. **`tests/ssg.test.ts`** - SSG 測試
2. **`tests/template-edge-cases.test.ts`** - 邊界案例
3. **`tests/orbit-integration.test.ts`** - Orbit 整合測試

```typescript
// tests/ssg.test.ts
import { describe, expect, it, mock } from 'bun:test'
import { StaticSiteGenerator } from '../src/SSG'

describe('StaticSiteGenerator', () => {
  it('should export static routes', async () => {
    const core = createMockCore()
    const ssg = new StaticSiteGenerator(core)
    
    await ssg.export('./dist-test')
    
    // Verify files created
    // ...
  })

  it('should handle routes with no static paths', async () => {
    const core = createMockCore({ routes: [] })
    const ssg = new StaticSiteGenerator(core)
    
    await ssg.export('./dist-test')
    
    expect(core.logger.warn).toHaveBeenCalledWith(
      '[SSG] No static routes found to export.'
    )
  })

  it('should generate sitemap.xml', async () => {
    const core = createMockCore()
    const ssg = new StaticSiteGenerator(core)
    
    await ssg.export('./dist-test', 'https://example.com')
    
    const sitemap = await Bun.file('./dist-test/sitemap.xml').text()
    expect(sitemap).toContain('<?xml version')
    expect(sitemap).toContain('https://example.com')
  })

  it('should generate robots.txt', async () => {
    const core = createMockCore()
    const ssg = new StaticSiteGenerator(core)
    
    await ssg.export('./dist-test', 'https://example.com')
    
    const robots = await Bun.file('./dist-test/robots.txt').text()
    expect(robots).toContain('User-agent: *')
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  it('should respect concurrency limits', async () => {
    // Test concurrent rendering doesn't exceed limit
    // ...
  })
})
```

```typescript
// tests/template-edge-cases.test.ts
import { describe, expect, it } from 'bun:test'
import { TemplateEngine } from '../src/TemplateEngine'

describe('TemplateEngine Edge Cases', () => {
  const engine = new TemplateEngine('./tests/fixtures/edge-cases')

  it('should handle deeply nested components (depth=10)', () => {
    const output = engine.render('nested-max', {})
    expect(output).toContain('level-10')
  })

  it('should throw on infinite include loops', () => {
    expect(() => {
      engine.render('circular-include', {})
    }).toThrow('Maximum include depth exceeded')
  })

  it('should handle malformed directives gracefully', () => {
    const output = engine.render('malformed-directives', {})
    // Should not throw, should render without processing malformed syntax
    expect(output).toBeDefined()
  })

  it('should handle missing sections gracefully', () => {
    const output = engine.render('missing-sections', {})
    expect(output).not.toContain('@yield')
  })

  it('should handle empty templates', () => {
    const output = engine.render('empty', {})
    expect(output).toBe('')
  })

  it('should handle unicode characters', () => {
    const output = engine.render('unicode', {
      emoji: '🚀',
      chinese: '你好世界',
      arabic: 'مرحبا'
    })
    
    expect(output).toContain('🚀')
    expect(output).toContain('你好世界')
    expect(output).toContain('مرحبا')
  })

  it('should escape XSS attempts', () => {
    const output = engine.render('simple', {
      userInput: '<script>alert("xss")</script>'
    })
    
    expect(output).not.toContain('<script>')
    expect(output).toContain('&lt;script&gt;')
  })
})
```

```typescript
// tests/orbit-integration.test.ts
import { describe, expect, it, mock } from 'bun:test'
import { OrbitPrism } from '../src/index'

describe('OrbitPrism Integration', () => {
  it('should install with default configuration', () => {
    const core = createMockCore()
    const orbit = new OrbitPrism()
    
    orbit.install(core)
    
    expect(core.adapter.use).toHaveBeenCalled()
    expect(core.container.instance).toHaveBeenCalledWith('view', expect.any(Object))
    expect(core.hooks.doAction).toHaveBeenCalledWith('view:helpers:register', expect.any(Object))
  })

  it('should install with custom cache options', () => {
    const core = createMockCore()
    const orbit = new OrbitPrism({
      cache: { maxSize: 1000, enabled: true }
    })
    
    orbit.install(core)
    
    const middleware = captureMiddleware(core)
    const context = createMockContext()
    
    await middleware(context, async () => {})
    
    expect(context.get('view')).toBeDefined()
  })

  it('should register image helper by default', () => {
    const core = createMockCore()
    const orbit = new OrbitPrism()
    
    orbit.install(core)
    
    const engine = captureEngine(core)
    expect(engine.helpers.has('image')).toBe(true)
  })

  it('should allow hook extensions', () => {
    const core = createMockCore()
    const orbit = new OrbitPrism()
    
    // Register custom helper via hook
    core.hooks.addAction('view:helpers:register', (engine) => {
      engine.registerHelper('custom', () => 'Custom Helper')
    })
    
    orbit.install(core)
    
    const engine = captureEngine(core)
    expect(engine.helpers.has('custom')).toBe(true)
  })
})
```

#### 驗收標準

- [ ] 總覆蓋率 >85%
- [ ] `src/index.ts` 函數覆蓋率 >90%
- [ ] `src/ImageService.ts` L167-168 覆蓋
- [ ] 所有新測試通過

---

### 3.5 更新 JSDoc 文檔

**檔案**: 所有 `src/*.ts`
**向下相容**: ✅ 文檔更新

#### 改進方案

確保所有公開 API 都有完整 JSDoc：

```typescript
/**
 * TemplateEngine - Core rendering engine for Gravito Prism.
 *
 * Implements a Blade-like syntax with support for:
 * - Layout inheritance (`@extends`, `@section`, `@yield`)
 * - Content stacks (`@push`, `@stack`)
 * - Reusable components (`<x-component>`)
 * - Custom helpers (`{{helper arg=value}}`)
 *
 * @example
 * ```typescript
 * const engine = new TemplateEngine('./views', {
 *   maxSize: 500,
 *   enabled: true
 * })
 *
 * engine.registerHelper('upper', (args) => String(args.value).toUpperCase())
 *
 * const html = engine.render('home', {
 *   name: 'World',
 *   showSubtitle: true
 * })
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class TemplateEngine {
  /**
   * Create a new TemplateEngine instance.
   *
   * @param viewsDir - Absolute path to views directory
   * @param cacheOptions - Optional cache configuration
   *
   * @example
   * ```typescript
   * const engine = new TemplateEngine('./src/views', {
   *   maxSize: 1000,
   *   enabled: process.env.NODE_ENV === 'production'
   * })
   * ```
   */
  constructor(viewsDir: string, cacheOptions?: CacheOptions) {
    // ...
  }

  /**
   * Register a custom helper function.
   *
   * Helpers can be invoked from templates using `{{helperName arg=value}}` syntax.
   *
   * @param name - Helper name (must be alphanumeric + underscore)
   * @param fn - Helper function
   *
   * @example
   * ```typescript
   * engine.registerHelper('formatDate', (args) => {
   *   const date = new Date(args.date)
   *   return date.toLocaleDateString()
   * })
   *
   * // In template:
   * // {{formatDate date="2024-01-01"}}
   * ```
   *
   * @public
   */
  public registerHelper(name: string, fn: HelperFunction): void {
    this.helpers.set(name, fn)
  }

  /**
   * Render a template with data.
   *
   * @param view - Template name (relative to viewsDir, without .html extension)
   * @param data - Data to pass to template
   * @param options - Render options (including legacy layout support)
   * @returns Rendered HTML string
   *
   * @throws {Error} If template file is not found
   * @throws {Error} If maximum depth exceeded (components or includes)
   *
   * @example
   * ```typescript
   * const html = engine.render('user/profile', {
   *   user: { name: 'John', email: 'john@example.com' },
   *   isAdmin: true
   * })
   * ```
   *
   * @public
   */
  public render(
    view: string,
    data: Record<string, unknown> = {},
    options: RenderOptions = {}
  ): string {
    // ...
  }
}
```

#### 檢查清單

- [ ] 所有 public 類別有 JSDoc
- [ ] 所有 public 方法有 JSDoc
- [ ] 所有 public 介面有 JSDoc
- [ ] 所有 JSDoc 包含 `@example`
- [ ] 所有 JSDoc 包含 `@param` 和 `@returns`
- [ ] 所有 JSDoc 包含 `@throws` (如適用)

---

## ✅ 驗收檢查清單

### LSP 驗收

- [ ] `noAssignInExpressions` 警告 = 0
- [ ] `noNonNullAssertion` 警告 = 0
- [ ] `bun run typecheck` 無錯誤、無警告
- [ ] Biome lint 通過

### 測試驗收

- [ ] 現有所有測試通過
- [ ] 新增 SSG 測試 (至少 5 個)
- [ ] 新增邊界案例測試 (至少 7 個)
- [ ] 新增 Orbit 整合測試 (至少 4 個)
- [ ] 總測試覆蓋率 >85%
- [ ] 所有檔案函數覆蓋率 >90%

### 類型安全驗收

- [ ] `src/SSG.ts` 無 `any` 類型
- [ ] TypeScript strict mode 啟用
- [ ] 所有公開 API 有明確類型

### 文檔驗收

- [ ] 所有公開 API 有完整 JSDoc
- [ ] 所有範例程式碼可執行
- [ ] 參數說明清晰

### 相容性驗收

- [ ] 所有修改都是內部重構
- [ ] 無 API 變更
- [ ] 所有依賴專案無需修改

---

## 📊 預期成果

| 指標 | 現狀 | 目標 |
|------|------|------|
| LSP 警告 | 4 個 | 0 個 |
| 測試覆蓋率 | 75-99% | >85% |
| TypeScript strict | 否 | 是 |
| JSDoc 覆蓋 | 部分 | 100% |

---

**下一文檔**: [Phase 4: SSG 增強](./PHASE4_SSG_ENHANCEMENT.md) →
