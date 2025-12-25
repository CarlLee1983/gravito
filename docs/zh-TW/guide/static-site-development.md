---
title: 靜態網站開發指南
---

# 使用 Orbit Freeze 建立靜態網站 (SSG)

使用 **Orbit Freeze (`@gravito/freeze`)** 將您的 Gravito 應用程式建置為極速靜態網站。

## 快速開始

### 選項 1：使用 CLI 模板（推薦）

最快的方式是使用 CLI 模板生成器：

```bash
# 創建新的靜態網站專案
gravito create my-static-site --template static-site

# 系統會提示您選擇 React 或 Vue 3
cd my-static-site
bun install
bun run dev
```

這將為您生成一個完整的靜態網站專案，包含：
- 預先配置的 `@gravito/freeze` 設定
- React 或 Vue 的 StaticLink 元件
- 靜態生成建構腳本
- 範例配置檔案

### 選項 2：手動設定

如果您偏好手動設定：

#### 1. 安裝套件

```bash
bun add @gravito/freeze
```

#### 2. 建立設定檔

在專案根目錄建立 `freeze.config.ts`：

```typescript
import { defineConfig } from '@gravito/freeze'

export const freezeConfig = defineConfig({
  // 您的正式環境網域
  staticDomains: ['example.com', 'example.github.io'],
  
  // 支援的語言
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  
  // 正式環境網址（用於 Sitemap）
  baseUrl: 'https://example.com',
  
  // 需要重導向的抽象路由
  redirects: [
    { from: '/docs', to: '/en/docs/guide/getting-started' },
    { from: '/about', to: '/en/about' },
  ],
})
```

### 3. 使用 StaticLink 元件

將所有內部導航的 Inertia `<Link>` 替換為 `StaticLink`：

**React：**
```tsx
import { createDetector } from '@gravito/freeze'
import { Link } from '@inertiajs/react'
import { freezeConfig } from '../freeze.config'

const detector = createDetector(freezeConfig)

export function StaticLink({ href, children, ...props }) {
  const localizedHref = detector.getLocalizedPath(href, currentLocale)
  
  if (detector.isStaticSite()) {
    return <a href={localizedHref} {...props}>{children}</a>
  }
  
  return <Link href={localizedHref} {...props}>{children}</Link>
}
```

**Vue：**
```vue
<script setup lang="ts">
import { createDetector } from '@gravito/freeze'
import { Link } from '@inertiajs/vue3'
import { freezeConfig } from '../freeze.config'

const detector = createDetector(freezeConfig)
const isStatic = detector.isStaticSite()
</script>

<template>
  <a v-if="isStatic" :href="localizedHref"><slot /></a>
  <Link v-else :href="localizedHref"><slot /></Link>
</template>
```

### 4. 建置靜態網站

```bash
# 建置並預覽
bun run build:static
bun run preview

# 或使用合併命令
bun run build:preview
```

---

## 運作原理

Gravito SSG 採用三階段流程，從動態開發到靜態部署：

### 階段一：開發模式（動態）

在開發階段，應用程式以傳統的動態模式運行：

- **Inertia SPA**：使用 Inertia.js 實現單頁應用體驗
- **熱重載（HMR）**：Vite 提供即時開發反饋
- **後端伺服器**：完整的 Gravito 核心功能可用
- **即時渲染**：所有路由動態生成

### 階段二：建置 SSG（凍結）

執行 `bun run build:static` 時，系統會：

- **預渲染所有頁面**：遍歷所有路由並生成 HTML
- **生成重導向**：為抽象路由創建重導向 HTML
- **建立 Sitemap**：自動生成包含多語系的 sitemap.xml
- **本地化路由**：為每個語系生成對應的路徑結構

### 階段三：部署（靜態）

生成的靜態檔案可部署到任何靜態託管服務：

- **GitHub Pages**：免費的靜態網站託管
- **Vercel**：全球 CDN 加速
- **Netlify**：自動化部署流程
- **Cloudflare Pages**：邊緣運算優化

### 流程圖

```
開發模式 (動態)  →  建置 SSG (凍結)  →  部署 (靜態)
     │                    │                  │
     ├─ Inertia SPA       ├─ 預渲染頁面      ├─ GitHub Pages
     ├─ 熱重載            ├─ 生成重導向      ├─ Vercel
     └─ 後端伺服器        └─ 建立 Sitemap    └─ Netlify/Cloudflare
```

### 環境偵測機制

`FreezeDetector` 會根據當前環境自動切換模式：

| 環境 | 模式 | 行為 |
|------|------|------|
| `localhost:3000` | 動態 | 使用 Inertia 導航 |
| `localhost:5173` | 動態 | Vite 開發伺服器 |
| `localhost:4173` | 靜態 | 預覽模式，使用普通連結標籤 |
| `*.github.io` | 靜態 | 靜態模式，使用普通連結標籤 |
| `*.vercel.app` | 靜態 | 靜態模式，使用普通連結標籤 |
| 自訂網域 | 靜態 | 根據 `staticDomains` 配置 |

---

## 設定參考

### FreezeConfig 選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `staticDomains` | `string[]` | `[]` | 靜態模式的正式網域 |
| `previewPort` | `number` | `4173` | 本地預覽伺服器埠號 |
| `locales` | `string[]` | `['en']` | 支援的語系 |
| `defaultLocale` | `string` | `'en'` | 預設語系（用於重導向） |
| `redirects` | `RedirectRule[]` | `[]` | 抽象路由重導向 |
| `outputDir` | `string` | `'dist-static'` | 輸出目錄 |
| `baseUrl` | `string` | - | 正式環境網址 |

### 環境偵測

`FreezeDetector` 會自動偵測靜態環境：

| 環境 | 偵測方式 | 模式 |
|------|---------|------|
| `localhost:3000` | 開發伺服器 | **動態** |
| `localhost:5173` | Vite 開發伺服器 | **動態** |
| `localhost:4173` | 預覽伺服器 | **靜態** |
| `*.github.io` | GitHub Pages | **靜態** |
| `*.vercel.app` | Vercel | **靜態** |
| `*.netlify.app` | Netlify | **靜態** |
| `*.pages.dev` | Cloudflare Pages | **靜態** |
| 設定的網域 | `staticDomains` | **靜態** |

---

## 國際化 (i18n)

### 語系感知路徑

所有路徑會自動本地化：

```typescript
const detector = createDetector(config)

// 添加語系前綴
detector.getLocalizedPath('/about', 'en')  // '/en/about'
detector.getLocalizedPath('/docs', 'zh')   // '/zh/docs'

// 切換語系
detector.switchLocale('/en/docs/guide', 'zh')  // '/zh/docs/guide'

// 從路徑提取語系
detector.getLocaleFromPath('/zh/about')  // 'zh'
```

### 語系切換器範例

```tsx
function LocaleSwitcher() {
  const detector = createDetector(freezeConfig)
  const currentPath = window.location.pathname
  
  const switchTo = (locale: string) => {
    const newPath = detector.switchLocale(currentPath, locale)
    window.location.href = newPath
  }
  
  return (
    <div>
      <button onClick={() => switchTo('en')}>English</button>
      <button onClick={() => switchTo('zh')}>中文</button>
    </div>
  )
}
```

---

## 專案結構

SSG 專案的建議結構：

```
my-site/
├── freeze.config.ts          # SSG 設定
├── build-static.ts           # 建置腳本
├── src/
│   ├── client/
│   │   ├── components/
│   │   │   ├── StaticLink.tsx    # 或 .vue
│   │   │   └── LocaleSwitcher.tsx
│   │   └── pages/
│   │       ├── Home.tsx
│   │       └── About.tsx
│   └── routes/
│       └── index.ts
├── dist-static/              # 生成的靜態檔案
│   ├── index.html
│   ├── en/
│   │   ├── index.html
│   │   └── about/
│   │       └── index.html
│   ├── zh/
│   │   ├── index.html
│   │   └── about/
│   │       └── index.html
│   ├── about/
│   │   └── index.html       # 重導向至 /en/about
│   ├── sitemap.xml
│   └── robots.txt
└── package.json
```

---

## [Complete] 開發檢查清單

部署靜態網站之前：

### 設定
- [ ] 建立 `freeze.config.ts`，設定您的網域和語系
- [ ] 將所有抽象路由加入 `redirects`
- [ ] 設定正確的 `baseUrl` 用於正式環境

### 元件
- [ ] 將所有 `<Link>` 替換為 `StaticLink`
- [ ] 使用 `detector.switchLocale()` 實作語系切換器
- [ ] 確保所有內部連結使用 `getLocalizedPath()`

### 建置與測試
- [ ] 執行 `bun run build:preview`
- [ ] 在 http://localhost:4173 測試
- [ ] 驗證：導航時沒有黑色遮罩
- [ ] 驗證：語系切換正常運作
- [ ] 驗證：抽象路由正確重導向
- [ ] 檢查瀏覽器控制台是否有錯誤

### 部署
- [ ] 設定 GitHub Pages / Vercel / Netlify
- [ ] 設定自訂網域（選用）
- [ ] 驗證正式環境網站

---

## 建置腳本範例

使用 `@gravito/freeze` 的完整建置腳本：

```typescript
// build-static.ts
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  generateRedirects,
  generateLocalizedRoutes,
  generateSitemapEntries,
} from '@gravito/freeze'
import { freezeConfig } from './freeze.config'

async function build() {
  const outputDir = freezeConfig.outputDir
  
  // 1. 建置客戶端資源
  console.log(' 建置客戶端資源...')
  await Bun.spawn(['bun', 'run', 'build:client']).exited
  
  // 2. 生成所有本地化路由
  const abstractRoutes = ['/', '/about', '/docs/guide/getting-started']
  const routes = generateLocalizedRoutes(abstractRoutes, freezeConfig.locales)
  
  // 3. 渲染每個路由
  for (const route of routes) {
    console.log(`渲染: ${route}`)
    // ... 您的渲染邏輯
  }
  
  // 4. 生成重導向
  console.log(' 生成重導向...')
  const redirects = generateRedirects(freezeConfig)
  for (const [path, html] of redirects) {
    const filePath = join(outputDir, path)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, html)
  }
  
  // 5. 生成 Sitemap
  console.log(' 生成 Sitemap...')
  const sitemapEntries = generateSitemapEntries(routes, freezeConfig)
  // ... 渲染 sitemap XML
  
  console.log('[Complete] SSG 建置完成！')
}

build()
```

---

## 最佳實踐

### 1. 永遠使用 StaticLink
```tsx
// ❌ 不要直接使用 Inertia Link
import { Link } from '@inertiajs/react'
<Link href="/about">關於</Link>

// [Complete] 使用 StaticLink 包裝器
import { StaticLink } from './components/StaticLink'
<StaticLink href="/about">關於</StaticLink>
```

### 2. 永遠包含語系前綴
```typescript
// ❌ 不要使用無前綴的路徑
const path = '/docs/guide'

// [Complete] 永遠本地化路徑
const path = detector.getLocalizedPath('/docs/guide', currentLocale)
```

### 3. 處理重導向
```typescript
// ❌ 不要讓抽象路由沒有重導向
// /about 會 404

// [Complete] 在設定中加入重導向
redirects: [
  { from: '/about', to: '/en/about' },
]
```

### 4. 部署前測試
```bash
# 永遠在本地測試靜態建置
bun run build:preview

# 訪問 http://localhost:4173
# 測試所有導航路徑
```

---

## API 參考

### `defineConfig(options)`
建立經過驗證的設定物件。

### `createDetector(config)`
建立偵測器實例用於執行階段檢查。

### `FreezeDetector` 方法
| 方法 | 說明 |
|------|------|
| `isStaticSite()` | 檢查是否在靜態模式執行 |
| `getLocaleFromPath(path)` | 從 URL 提取語系 |
| `getLocalizedPath(path, locale)` | 為路徑添加語系前綴 |
| `switchLocale(path, newLocale)` | 在 URL 中切換語系 |
| `needsRedirect(path)` | 檢查路徑是否需要重導向 |
| `getCurrentLocale()` | 取得目前語系（僅瀏覽器） |

### 建置工具
| 函式 | 說明 |
|------|------|
| `generateRedirectHtml(url)` | 建立重導向 HTML |
| `generateRedirects(config)` | 生成所有重導向 |
| `generateLocalizedRoutes(routes, locales)` | 建立本地化路由 |
| `inferRedirects(locales, default, routes)` | 自動推斷重導向 |
| `generateSitemapEntries(routes, config)` | 建立含 i18n 的 Sitemap |

---

## 部署指南

### GitHub Pages
```yaml
# .github/workflows/deploy.yml
- name: 建置靜態網站
  run: bun run build:static

- name: 部署至 GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist-static
```

### Vercel
```json
// vercel.json
{
  "buildCommand": "bun run build:static",
  "outputDirectory": "dist-static"
}
```

### Netlify
```toml
# netlify.toml
[build]
  command = "bun run build:static"
  publish = "dist-static"
```

---

遵循此指南，您的 Gravito 應用程式可以無縫部署為高效能靜態網站！
