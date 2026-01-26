# Phase 8: 開發者體驗（DX）優化

[← 返回總覽](../README.md)

---


### 8.1 改善類型安全與 IDE 支持

**當前問題** (`src/types.ts:13`):
```typescript
resolvers: unknown[] // Changed to avoid circular dependency
```

**問題分析**:
- `resolvers` 使用 `unknown[]`，失去類型安全
- IDE 無法提供自動完成
- 編譯時無法發現配置錯誤

**優化方案 A: 使用泛型與條件類型**
```typescript
export interface SeoConfig {
  mode: SeoMode
  baseUrl: string
  resolvers: SeoResolver[] // ✅ 恢復類型定義
  // ...
}

// 在需要的地方使用類型斷言，但保持類型安全
```

**優化方案 B: 配置範例類型**
```typescript
/**
 * 配置範例類型，提供更好的 IDE 提示
 * @example
 * ```typescript
 * const config: SeoConfig = {
 *   mode: 'incremental',
 *   baseUrl: 'https://example.com',
 *   resolvers: [
 *     {
 *       name: 'posts',
 *       fetch: async () => { /* ... */ }
 *     }
 *   ]
 * }
 * ```
 */
export interface SeoConfig {
  // ...
}
```

**優化方案 C: 配置構建器模式**
```typescript
export class SeoConfigBuilder {
  private config: Partial<SeoConfig> = {}

  mode(mode: SeoMode): this {
    this.config.mode = mode
    return this
  }

  baseUrl(url: string): this {
    this.config.baseUrl = url
    return this
  }

  resolver(resolver: SeoResolver): this {
    if (!this.config.resolvers) {
      this.config.resolvers = []
    }
    this.config.resolvers.push(resolver)
    return this
  }

  build(): SeoConfig {
    // 驗證並返回
    return this.config as SeoConfig
  }
}
```

**實施步驟**:
1. 先實施方案 A（恢復類型定義）
2. 添加完整的 JSDoc 註解（方案 B）
3. 如果用戶反饋需要，考慮方案 C（構建器模式）

**預期提升**:
- IDE 自動完成準確度 100%
- 編譯時錯誤發現率提升 80%
- 開發效率提升 30-50%

**優先級**: 🔴 高

---

### 8.2 改善配置驗證與錯誤訊息

**當前問題** (`src/config/ConfigLoader.ts:54-75`):
```typescript
private validate(config: unknown): void {
  if (mode !== 'dynamic' && mode !== 'cached' && mode !== 'incremental') {
    throw new Error('Config missing "mode"') // ❌ 錯誤訊息不夠詳細
  }
  // ...
}
```

**問題分析**:
- 錯誤訊息太簡單，缺少上下文
- 沒有提供修復建議
- 沒有指出具體的配置路徑

**優化方案: 詳細錯誤訊息 + 修復建議**
```typescript
private validate(config: unknown): void {
  const errors: string[] = []
  const suggestions: string[] = []

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object')
    suggestions.push('Ensure your config file exports a default object')
    throw new ValidationError(errors, suggestions)
  }

  const raw = config as Record<string, unknown>

  // 檢查 mode
  const mode = raw.mode
  if (!mode) {
    errors.push('Missing required field: "mode"')
    suggestions.push('Add mode: "dynamic" | "cached" | "incremental"')
  } else if (mode !== 'dynamic' && mode !== 'cached' && mode !== 'incremental') {
    errors.push(`Invalid mode: "${mode}"`)
    suggestions.push('Use one of: "dynamic", "cached", "incremental"')
  }

  // 檢查 baseUrl
  const baseUrl = raw.baseUrl
  if (!baseUrl) {
    errors.push('Missing required field: "baseUrl"')
    suggestions.push('Add baseUrl: "https://example.com" (no trailing slash)')
  } else if (typeof baseUrl !== 'string') {
    errors.push(`baseUrl must be a string, got: ${typeof baseUrl}`)
  } else if (!baseUrl.match(/^https?:\/\//)) {
    errors.push(`baseUrl must start with http:// or https://`)
    suggestions.push(`Use: "https://${baseUrl}"`)
  }

  // 檢查 resolvers
  const resolvers = raw.resolvers
  if (!resolvers) {
    errors.push('Missing required field: "resolvers"')
    suggestions.push('Add resolvers: [{ name: "...", fetch: async () => [...] }]')
  } else if (!Array.isArray(resolvers)) {
    errors.push(`resolvers must be an array, got: ${typeof resolvers}`)
  } else if (resolvers.length === 0) {
    errors.push('resolvers array is empty')
    suggestions.push('Add at least one resolver to generate sitemap entries')
  }

  if (errors.length > 0) {
    throw new ValidationError(errors, suggestions, raw)
  }
}

class ValidationError extends Error {
  constructor(
    public errors: string[],
    public suggestions: string[],
    public config?: Record<string, unknown>
  ) {
    const message = [
      '❌ Configuration Validation Failed',
      '',
      'Errors:',
      ...errors.map(e => `  • ${e}`),
      '',
      'Suggestions:',
      ...suggestions.map(s => `  💡 ${s}`),
      '',
      'Example configuration:',
      '```typescript',
      'export default {',
      '  mode: "incremental",',
      '  baseUrl: "https://example.com",',
      '  resolvers: [',
      '    { name: "posts", fetch: async () => [...] }',
      '  ]',
      '}',
      '```',
    ].join('\n')
    super(message)
    this.name = 'ValidationError'
  }
}
```

**進一步優化: 配置檢查工具**
```typescript
// CLI 命令: lux validate
async function validateConfig() {
  const loader = new ConfigLoader()
  try {
    const config = await loader.load()
    console.log('✅ Configuration is valid!')
    console.log(`   Mode: ${config.mode}`)
    console.log(`   Base URL: ${config.baseUrl}`)
    console.log(`   Resolvers: ${config.resolvers.length}`)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(error.message)
      process.exit(1)
    }
    throw error
  }
}
```

**預期提升**:
- 配置錯誤解決時間減少 60-80%
- 新手上手時間減少 40-60%
- 錯誤訊息清晰度提升 90%

**優先級**: 🔴 高

---

### 8.3 完善 CLI 工具功能

**當前問題** (`src/cli.ts:16-23`):
```typescript
case 'warm':
  console.log('🔥 Warming cache... (Not implemented yet)') // ❌ 未實現
  break
case 'generate':
  console.log('⚙️  Generating sitemap... (Not implemented yet)') // ❌ 未實現
  break
case 'init':
  console.log('📝 Creating luminosity.config.ts... (Not implemented yet)') // ❌ 未實現
  break
```

**優化方案 A: 實現 init 命令**
```typescript
async function initConfig() {
  const configPath = 'gravito.seo.config.ts'
  if (existsSync(configPath)) {
    console.error(`❌ ${configPath} already exists`)
    process.exit(1)
  }

  const template = `import type { SeoConfig } from '@gravito/luminosity'

const config: SeoConfig = {
  mode: 'incremental',
  baseUrl: 'https://example.com',
  resolvers: [
    {
      name: 'pages',
      fetch: async () => {
        // TODO: Implement your resolver
        return []
      },
    },
  ],
  incremental: {
    logDir: './storage/seo',
    compactInterval: 3600000, // 1 hour
  },
}

export default config
`

  writeFileSync(configPath, template)
  console.log(`✅ Created ${configPath}`)
  console.log('📝 Edit the file to configure your resolvers')
}
```

**優化方案 B: 實現 generate 命令**
```typescript
async function generateSitemap() {
  const loader = new ConfigLoader()
  const config = await loader.load()

  const engine = new SeoEngine(config)
  await engine.init()

  const entries = await engine.getStrategy().getEntries()
  const luminosity = new Luminosity({
    path: config.output?.path || './public',
    hostname: config.baseUrl,
    gzip: config.gzip,
  })

  await luminosity.generate(entries)
  console.log(`✅ Generated sitemap with ${entries.length} URLs`)
}
```

**優化方案 C: 實現 warm 命令**
```typescript
async function warmCache() {
  const loader = new ConfigLoader()
  const config = await loader.load()

  if (config.mode !== 'cached') {
    console.warn('⚠️  Cache warming only works in "cached" mode')
    process.exit(1)
  }

  const engine = new SeoEngine(config)
  await engine.init()

  console.log('🔥 Warming cache...')
  const entries = await engine.getStrategy().getEntries()
  console.log(`✅ Cache warmed with ${entries.length} entries`)
}
```

**優化方案 D: 添加調試模式**
```typescript
// lux --debug generate
// lux --verbose inspect <url>

const DEBUG = process.env.DEBUG === '1' || args.includes('--debug')
const VERBOSE = args.includes('--verbose')

if (DEBUG) {
  // 啟用詳細日誌
  process.env.LUMINOSITY_DEBUG = '1'
}
```

**實施步驟**:
1. 實施方案 A（init）- 最高優先級
2. 實施方案 B（generate）
3. 實施方案 C（warm）
4. 實施方案 D（調試模式）

**預期提升**:
- 新手上手時間減少 50-70%
- CLI 工具實用性提升 80%
- 開發效率提升 30-40%

**優先級**: 🔴 高

---

### 8.4 添加開發模式與調試工具

**當前問題**:
- 缺少開發模式（更詳細的日誌）
- 缺少性能分析工具
- 缺少配置調試工具

**優化方案 A: 開發模式**
```typescript
export interface SeoConfig {
  // ...
  /** Development mode - enables verbose logging and debugging */
  dev?: {
    enabled?: boolean
    verbose?: boolean
    logLevel?: 'debug' | 'info' | 'warn' | 'error'
    performance?: boolean // 記錄性能指標
  }
}

// 在 SeoEngine 中使用
if (config.dev?.enabled) {
  console.debug('[GravitoSeo] Mode:', config.mode)
  console.debug('[GravitoSeo] Resolvers:', config.resolvers.length)
  
  if (config.dev.performance) {
    const start = performance.now()
    const entries = await this.strategy.getEntries()
    const duration = performance.now() - start
    console.debug(`[GravitoSeo] getEntries took ${duration.toFixed(2)}ms`)
  }
}
```

**優化方案 B: 配置檢查工具**
```typescript
// lux check
async function checkConfig() {
  const loader = new ConfigLoader()
  const config = await loader.load()

  console.log('🔍 Checking configuration...\n')

  // 檢查 resolvers
  for (const resolver of config.resolvers) {
    try {
      const entries = await resolver.fetch()
      console.log(`✅ ${resolver.name}: ${entries.length} entries`)
    } catch (error) {
      console.error(`❌ ${resolver.name}: ${error.message}`)
    }
  }

  // 檢查存儲
  if (config.mode === 'incremental') {
    const logPath = join(config.incremental.logDir, 'sitemap.ops.jsonl')
    if (existsSync(logPath)) {
      const stats = await stat(logPath)
      console.log(`📁 Log file: ${(stats.size / 1024).toFixed(2)} KB`)
    }
  }
}
```

**優化方案 C: 性能分析工具**
```typescript
// lux profile generate
async function profileGeneration() {
  const loader = new ConfigLoader()
  const config = await loader.load()

  const timings: Record<string, number> = {}

  // 測量各個階段
  const startTotal = performance.now()
  
  const startInit = performance.now()
  const engine = new SeoEngine(config)
  await engine.init()
  timings.init = performance.now() - startInit

  const startFetch = performance.now()
  const entries = await engine.getStrategy().getEntries()
  timings.fetch = performance.now() - startFetch

  const startRender = performance.now()
  const xml = await engine.render('/sitemap.xml')
  timings.render = performance.now() - startRender

  timings.total = performance.now() - startTotal

  // 輸出報告
  console.log('📊 Performance Profile:')
  console.table(timings)
}
```

**實施步驟**:
1. 實施方案 A（開發模式）
2. 實施方案 B（配置檢查）
3. 實施方案 C（性能分析）

**預期提升**:
- 調試效率提升 50-70%
- 問題定位時間減少 60-80%
- 開發體驗提升 40-60%

**優先級**: 🟡 中

---

### 8.5 改善錯誤處理與日誌

**當前問題** (`src/engine/strategies/DynamicStrategy.ts:31`):
```typescript
console.error(`[GravitoSeo] Resolver '${resolver.name}' failed:`, e) // ❌ 簡單的 console.error
```

**問題分析**:
- 錯誤日誌格式不一致
- 缺少錯誤上下文
- 無法追蹤錯誤來源

**優化方案: 結構化日誌**
```typescript
interface LogContext {
  resolver?: string
  mode?: string
  operation?: string
  [key: string]: unknown
}

class Logger {
  private context: LogContext = {}

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  error(message: string, error?: Error, context?: LogContext) {
    const fullContext = { ...this.context, ...context }
    console.error(`[GravitoSeo] ${message}`, {
      error: error?.message,
      stack: error?.stack,
      ...fullContext,
    })
  }

  warn(message: string, context?: LogContext) {
    console.warn(`[GravitoSeo] ${message}`, { ...this.context, ...context })
  }

  debug(message: string, context?: LogContext) {
    if (process.env.LUMINOSITY_DEBUG) {
      console.debug(`[GravitoSeo] ${message}`, { ...this.context, ...context })
    }
  }
}

// 使用
const logger = new Logger()
logger.setContext({ mode: config.mode, resolver: resolver.name })
logger.error('Resolver failed', error, { entryCount: entries.length })
```

**進一步優化: 錯誤恢復策略**
```typescript
async getEntries(): Promise<SitemapEntry[]> {
  const results = await Promise.allSettled(
    resolvers.map(async (resolver) => {
      try {
        return await resolver.fetch()
      } catch (error) {
        logger.error(`Resolver '${resolver.name}' failed`, error)
        
        // 如果配置了 fallback，使用它
        if (resolver.fallback) {
          return await resolver.fallback()
        }
        
        // 否則返回空數組，不中斷整個流程
        return []
      }
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<SitemapEntry[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
}
```

**優先級**: 🟡 中

---

### 8.6 添加測試輔助工具

**當前問題**:
- 缺少測試輔助函數
- 缺少 Mock 工具
- 缺少測試配置生成器

**優化方案: 測試工具包**
```typescript
// src/testing/index.ts
export class TestHelpers {
  static createMockResolver(name: string, entries: SitemapEntry[]): SeoResolver {
    return {
      name,
      fetch: async () => entries,
    }
  }

  static createTestConfig(overrides?: Partial<SeoConfig>): SeoConfig {
    return {
      mode: 'dynamic',
      baseUrl: 'https://test.example.com',
      resolvers: [],
      ...overrides,
    }
  }

  static async withTempStorage<T>(
    fn: (path: string) => Promise<T>
  ): Promise<T> {
    const tempDir = await mkdtemp(join(tmpdir(), 'luminosity-test-'))
    try {
      return await fn(tempDir)
    } finally {
      await rm(tempDir, { recursive: true })
    }
  }
}

// 使用範例
test('should generate sitemap', async () => {
  await TestHelpers.withTempStorage(async (tempDir) => {
    const config = TestHelpers.createTestConfig({
      mode: 'incremental',
      incremental: { logDir: tempDir },
    })
    // ... 測試
  })
})
```

**優先級**: 🟢 低

---

### 8.7 改善文檔與範例

**當前問題**:
- 缺少內聯 JSDoc
- 缺少常見使用場景範例
- 缺少故障排除指南

**優化方案 A: 完整的 JSDoc**
```typescript
/**
 * SEO Engine for generating sitemaps and managing robots.txt
 * 
 * @example
 * ```typescript
 * const config: SeoConfig = {
 *   mode: 'incremental',
 *   baseUrl: 'https://example.com',
 *   resolvers: [
 *     {
 *       name: 'posts',
 *       fetch: async () => {
 *         const posts = await db.posts.findMany()
 *         return posts.map(p => ({
 *           url: `/posts/${p.slug}`,
 *           lastmod: p.updatedAt,
 *         }))
 *       },
 *     },
 *   ],
 * }
 * 
 * const engine = new SeoEngine(config)
 * await engine.init()
 * ```
 * 
 * @see {@link SeoConfig} for configuration options
 * @see {@link SeoStrategy} for strategy implementations
 */
export class SeoEngine {
  // ...
}
```

**優化方案 B: 常見場景範例**
```typescript
// examples/blog-site.ts
export const blogConfig: SeoConfig = {
  mode: 'incremental',
  baseUrl: 'https://blog.example.com',
  resolvers: [
    {
      name: 'blog-posts',
      fetch: async () => {
        // 範例：從數據庫獲取博客文章
      },
    },
  ],
}

// examples/ecommerce-site.ts
export const ecommerceConfig: SeoConfig = {
  // 範例：電商網站配置
}
```

**優先級**: 🟡 中

---

---

