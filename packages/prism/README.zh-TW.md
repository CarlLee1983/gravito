# @gravito/prism 💎

> 高效能模板引擎與圖片優化 Orbit，專為 Gravito 框架設計。

`@gravito/prism` 是 Gravito 框架的標準視圖 Orbit。它結合了受 Blade 啟發的伺服器端模板引擎，以及強大的圖片優化服務，旨在協助開發者輕鬆達成完美的 Core Web Vitals 評分。

## 🌟 核心特性

- **🚀 效能至上**：支援 LRU 模板快取與基於 Hash 的失效驗證（渲染速度提升 140 倍）。
- **🖼️ 進階圖片優化**：自動轉換 AVIF/WebP、生成響應式 `srcset` 以及 LQIP 模糊預覽圖。
- **🏗️ 靜態網站生成 (SSG)**：支援完整站點匯出與增量建置（僅重新建置已變更的頁面）。
- **🧩 組件化系統**：使用簡潔的 `<x-component>` 語法構建 UI。
- **⚡ Core Web Vitals 優化**：自動防止版面移動 (CLS)、延遲載入 (Lazy Loading) 與權重提示 (Priority Hints)。
- **🔌 多框架支援**：提供選配的 React 與 Vue 組件，實現無縫整合。

## 📦 安裝

```bash
bun add @gravito/prism
```

## 🚀 快速上手

### 1. 註冊 Orbit

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'

const core = await PlanetCore.boot({
  config: { VIEW_DIR: 'src/views' },
  orbits: [new OrbitPrism()]
})
```

### 2. 渲染模板

Prism 支援豐富的指令集：

```handlebars
{{-- src/views/home.html --}}
@extends('layout')

@section('content')
  <h1>歡迎, {{ user.name }}</h1>
  
  @if(items.length > 0)
    <ul>
      @foreach(item in items)
        <li>{{ item.name }}</li>
      @endforeach
    </ul>
  @endif

  <x-alert type="success">操作已完成！</x-alert>
@endsection
```

```typescript
const view = core.container.resolve('view')
const html = view.render('home', { user: { name: 'Carl' }, items: [] })
```

### 3. 圖片優化

使用內建的 `{{image}}` Helper 生成高度優化的標籤：

```handlebars
{{image 
  src="/hero.jpg" 
  alt="英雄圖" 
  width=1200 
  height=630
  placeholder="blur"
  formatNegotiation=true
}}
```

## ⏳ 進階功能

### 靜態網站生成 (SSG)

Prism 可以爬取您的路由並生成完全靜態的站點：

```typescript
const ssg = core.container.resolve('ssg')

// 完整匯出
await ssg.export('./dist', 'https://example.com')

// 增量匯出（極速重新建置）
await ssg.exportIncremental('./dist', { incremental: true })
```

### 動態路由解析

處理如 `/blog/[slug]` 等動態路徑的靜態生成：

```typescript
await ssg.exportDynamic([
  {
    pattern: '/blog/[slug]',
    getStaticPaths: async () => {
      const posts = await db.getPosts()
      return posts.map(p => ({ params: { slug: p.slug } }))
    }
  }
], './dist')
```

## 🛠️ 支援的圖片 CDN

Prism 整合了主流 CDN，支援即時圖片轉換：
- **Cloudinary**: `createCloudinaryLoader({ cloudName: '...' })`
- **imgix**: `createImgixLoader({ domain: '...' })`
- **Vercel**: `vercelLoader` (內建)

## 🧩 API 參考

- `view.render(name, data)`：渲染模板檔案。
- `view.registerHelper(name, fn)`：註冊自定義模板 Helper。
- `ssg.export(outDir, baseUrl)`：將站點匯出為靜態檔案。
- `ImageService`：生成最佳化圖片標籤的核心邏輯。

## 🤝 參與貢獻

我們歡迎任何形式的貢獻！詳細資訊請參閱 [貢獻指南](../../CONTRIBUTING.md)。

## 📄 開源授權

MIT © Carl Lee
