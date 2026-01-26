# @gravito/prism API 參考

> **版本**: 3.1.0
> **最後更新**: 2026-01-22

---

## 目錄

- [OrbitPrism](#orbitprism)
- [TemplateEngine](#templateengine)
- [TemplateCompiler](#templatecompiler)
- [TemplateCache](#templatecache)
- [ImageService](#imageservice)
- [StaticSiteGenerator](#staticsitegenerator)
- [IncrementalBuilder](#incrementalbuilder)
- [DynamicRouteResolver](#dynamicrouteresolver)
- [CDN Loaders](#cdn-loaders)
- [LQIP Utilities](#lqip-utilities)
- [React/Vue Components](#reactvue-components)

---

## OrbitPrism

Gravito 視圖引擎 Orbit，用於整合 PlanetCore。

### Constructor

```typescript
new OrbitPrism(options?: OrbitPrismOptions)
```

### Options

```typescript
interface OrbitPrismOptions {
  cache?: CacheOptions
  ssg?: SSGOptions
}

interface CacheOptions {
  maxSize?: number      // 最大快取數量 (預設: 500)
  enabled?: boolean     // 啟用快取 (預設: true)
  development?: boolean // 開發模式 (預設: false)
}

interface SSGOptions {
  concurrency?: number  // 並行數 (預設: 10)
  timeout?: number      // 逾時 (預設: 30000ms)
  incremental?: boolean // 增量建置 (預設: false)
  manifestPath?: string // Manifest 路徑
}
```

### 範例

```typescript
import { OrbitPrism } from '@gravito/prism'

const prism = new OrbitPrism({
  cache: {
    maxSize: 1000,
    enabled: process.env.NODE_ENV === 'production'
  }
})

core.addOrbit(prism)
```

---

## TemplateEngine

模板渲染引擎核心類別。

### Constructor

```typescript
new TemplateEngine(viewsDir: string, cacheOptions?: CacheOptions)
```

### Methods

#### render

渲染模板。

```typescript
render(
  view: string,
  data?: Record<string, unknown>,
  options?: RenderOptions
): string
```

**參數:**
- `view` - 模板名稱（相對於 viewsDir，不含 .html）
- `data` - 傳遞給模板的資料
- `options` - 渲染選項

**範例:**
```typescript
const html = engine.render('home', {
  title: 'Welcome',
  user: { name: 'John' }
})
```

#### registerHelper

註冊自訂 Helper。

```typescript
registerHelper(name: string, fn: HelperFunction): void
```

**範例:**
```typescript
engine.registerHelper('formatDate', (args) => {
  return new Date(args.date as string).toLocaleDateString()
})
```

#### unregisterHelper

移除已註冊的 Helper。

```typescript
unregisterHelper(name: string): void
```

#### getCacheStats

取得快取統計資訊。

```typescript
getCacheStats(): CacheStats
```

**回傳:**
```typescript
interface CacheStats {
  hits: number
  misses: number
  evictions: number
  size: number
}
```

#### clearCache

清除模板快取。

```typescript
clearCache(): void
```

---

## TemplateCompiler

模板編譯器，處理指令和組件。

### Constructor

```typescript
new TemplateCompiler(options?: CompilerOptions)
```

### Options

```typescript
interface CompilerOptions {
  strict?: boolean  // 嚴格模式
  debug?: boolean   // 除錯模式
}
```

### Methods

#### compile

編譯模板。

```typescript
compile(
  template: string,
  data: Record<string, unknown>,
  ctx: RenderContext,
  helpers: Map<string, HelperFunction>,
  readTemplate: (name: string) => string
): string
```

#### extractSections

提取 `@section` 指令。

```typescript
extractSections(template: string, ctx: RenderContext): void
```

#### extractStacks

提取 `@push` 指令。

```typescript
extractStacks(template: string, ctx: RenderContext): void
```

#### getMetadata

取得模板元資料。

```typescript
getMetadata(source: string): CompiledMetadata
```

---

## TemplateCache

LRU 快取實作。

### Constructor

```typescript
new TemplateCache(options?: CacheOptions)
```

### Methods

#### getSource / setSource

取得/設定原始模板快取。

```typescript
getSource(name: string): string | null
setSource(name: string, source: string): void
```

#### getCompiled / setCompiled

取得/設定編譯後模板快取。

```typescript
getCompiled(name: string, sourceHash: string): CompiledTemplate | null
setCompiled(name: string, source: string, render: RenderFunction, dependencies?: string[]): void
```

#### computeHash

計算內容 Hash。

```typescript
computeHash(source: string): string
```

#### invalidate

失效指定模板。

```typescript
invalidate(name: string): void
```

#### clear

清除所有快取。

```typescript
clear(): void
```

#### getStats / getHitRate

取得統計資訊。

```typescript
getStats(): CacheStats
getHitRate(): number
```

---

## ImageService

圖片標籤生成服務。

### Constructor

```typescript
new ImageService()
```

### Methods

#### generateImageTag

產生 `<img>` 標籤。

```typescript
generateImageTag(options: ImageOptions): string
```

#### generatePictureElement

產生 `<picture>` 元素（支援格式協商）。

```typescript
generatePictureElement(options: ImageOptions): string
```

### ImageOptions

```typescript
interface ImageOptions {
  src: string
  alt: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'auto' | 'sync'
  fetchpriority?: 'high' | 'low' | 'auto'
  sizes?: string
  srcset?: boolean | number[]
  class?: string
  style?: string

  // v3.1.0 新增
  formatNegotiation?: boolean
  usePicture?: boolean
  placeholder?: 'none' | 'blur' | 'color'
  blurDataURL?: string
  dominantColor?: string
  loader?: ImageCDNLoader
  artDirection?: ArtDirectionConfig[]
}
```

---

## StaticSiteGenerator

靜態網站生成器。

### Constructor

```typescript
new StaticSiteGenerator(core: PlanetCore)
```

### Methods

#### export

導出所有靜態路由。

```typescript
export(
  outputDir: string,
  baseUrl?: string,
  extraPaths?: string[]
): Promise<void>
```

#### exportDynamic

導出動態路由。

```typescript
exportDynamic(
  dynamicRoutes: DynamicRoute[],
  outputDir: string,
  options?: ExportOptions
): Promise<void>
```

#### exportIncremental

增量導出。

```typescript
exportIncremental(
  outputDir: string,
  options?: ExportOptions
): Promise<void>
```

### ExportOptions

```typescript
interface ExportOptions {
  baseUrl?: string
  concurrency?: number
  timeout?: number
  incremental?: boolean
  force?: boolean
  manifestPath?: string
}
```

---

## IncrementalBuilder

增量建置器。

### Constructor

```typescript
new IncrementalBuilder(
  core: PlanetCore,
  outputDir: string,
  options?: IncrementalOptions
)
```

### Methods

#### export

執行增量導出。

```typescript
export(
  routes: Array<{ path: string; getData?: () => Promise<any> }>,
  baseUrl: string,
  options?: IncrementalOptions
): Promise<{ built: number; skipped: number; failed: number }>
```

#### getStats

取得建置統計。

```typescript
getStats(): {
  totalPages: number
  totalSize: number
  lastBuild: number
  oldestPage: number
  newestPage: number
}
```

---

## DynamicRouteResolver

動態路由解析器。

### Static Methods

#### resolve

解析動態路由為靜態路徑。

```typescript
static resolve(routes: DynamicRoute[]): Promise<ResolvedRoute[]>
```

### DynamicRoute

```typescript
interface DynamicRoute {
  pattern: string  // e.g., '/blog/[slug]', '/docs/[...path]'
  getStaticPaths: () => Promise<Array<{
    params: Record<string, string>
    data?: unknown
  }>>
}
```

### ResolvedRoute

```typescript
interface ResolvedRoute {
  path: string
  getData?: () => Promise<unknown>
}
```

---

## CDN Loaders

### createCloudinaryLoader

```typescript
import { createCloudinaryLoader } from '@gravito/prism'

const loader = createCloudinaryLoader({
  cloudName: 'your-cloud-name',
  defaultQuality?: number  // 預設: 80
})
```

### createImgixLoader

```typescript
import { createImgixLoader } from '@gravito/prism'

const loader = createImgixLoader({
  domain: 'your-domain.imgix.net',
  defaultQuality?: number  // 預設: 80
})
```

### vercelLoader

```typescript
import { vercelLoader } from '@gravito/prism'

// 內建 Vercel Image Optimization loader
```

### ImageCDNLoader Interface

```typescript
interface ImageCDNLoader {
  name: string
  transform(src: string, options: TransformOptions): string
  canHandle?(src: string): boolean
}

interface TransformOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'avif' | 'webp' | 'auto' | 'original'
  fit?: 'cover' | 'contain' | 'fill'
}
```

---

## LQIP Utilities

### calculateMinLQIPSize

計算符合 Chrome LCP 要求的最小 LQIP 尺寸。

```typescript
calculateMinLQIPSize(width: number, height: number): number
```

### calculateLQIPDimensions

計算建議的 LQIP 尺寸。

```typescript
calculateLQIPDimensions(
  width: number,
  height: number,
  targetWidth?: number  // 預設: 20
): { width: number; height: number }
```

### generatePlaceholderStyles

產生模糊效果 CSS。

```typescript
generatePlaceholderStyles(
  blurDataURL: string,
  width: number,
  height: number
): Record<string, string>
```

### generateColorPlaceholder

產生純色佔位符 SVG。

```typescript
generateColorPlaceholder(
  color: string,
  width: number,
  height: number
): string  // data:image/svg+xml;base64,...
```

### hexToRGB

十六進位轉 RGB。

```typescript
hexToRGB(hex: string): { r: number; g: number; b: number }
```

---

## React/Vue Components

### React Image

```tsx
import { Image } from '@gravito/prism'

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  loading="lazy"
  srcset={[640, 1200, 1920]}
  formatNegotiation
  usePicture
/>
```

### Vue Image

```vue
<script setup>
import { GravitoImage } from '@gravito/prism/vue'
</script>

<template>
  <GravitoImage
    src="/hero.jpg"
    alt="Hero"
    :width="1200"
    :height="630"
    loading="lazy"
    :srcset="[640, 1200, 1920]"
    format-negotiation
    use-picture
  />
</template>
```

---

## 模板語法參考

### 變數插值

```handlebars
{{ variable }}        <!-- 轉義 HTML -->
{{{ rawHtml }}}       <!-- 原始 HTML -->
{{ user.name }}       <!-- 巢狀屬性 -->
```

### 條件判斷

```handlebars
@if(condition)
  ...
@else
  ...
@endif

@unless(condition)
  ...
@endunless
```

### 迴圈

```handlebars
{{#each items}}
  {{ this.name }}
{{/each}}
```

### 繼承

```handlebars
<!-- 子模板 -->
@extends('layouts/main')

@section('content')
  <h1>Page Content</h1>
@endsection

<!-- 父模板 -->
<main>
  @yield('content')
</main>
```

### 堆疊

```handlebars
<!-- 子模板 -->
@push('scripts')
  <script src="/app.js"></script>
@endpush

<!-- 父模板 -->
@stack('scripts')
```

### 包含

```handlebars
@include('partials/header')
{{ include 'partials/footer' }}
```

### 組件

```handlebars
<x-button type="primary">
  Click me
</x-button>

<x-card title="Hello">
  <x-slot:footer>
    Footer content
  </x-slot:footer>
  Main content
</x-card>
```

### 內建指令

```handlebars
@csrf                           <!-- CSRF token -->
@inertia                        <!-- Inertia.js app div -->
@vite(['src/app.js'])          <!-- Vite 資源載入 -->
```

---

**相關文檔:**
- [架構說明](./ARCHITECTURE.md)
- [遷移指南](./MIGRATION.md)
- [驗收標準](./ACCEPTANCE_CRITERIA.md)
