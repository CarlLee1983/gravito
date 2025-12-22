---
title: 靜態網站開發指南
---

# 📦 靜態網站生成 (SSG) 開發指南

本指南記錄了開發模式 (SSR + Inertia.js) 與靜態網站生成 (SSG) 之間的關鍵差異，以及確保程式碼在兩種環境中都能正確運作的最佳實踐。

## 🎯 概述

Gravito 支援兩種部署模式：

| 模式 | 描述 | 使用場景 |
|------|------|----------|
| **SSR（開發模式）** | 全端 Inertia.js SPA 導航 | 開發環境、動態應用 |
| **SSG（生產模式）** | 預渲染的靜態 HTML 檔案 | 文件網站、靜態託管（GitHub Pages、Cloudflare Pages） |

**⚠️ 關鍵理解**：在 SSG 模式下，**沒有後端伺服器**來處理 Inertia 請求。所有導航必須使用標準 HTML 連結。

---

## 🚨 常見問題與解決方案

### 1. Inertia Link 元件問題

**問題**：Inertia 的 `<Link>` 元件在靜態網站中會造成問題：
- 導航時出現黑色遮罩
- 意外開啟新分頁
- 導航卡住或無限迴圈

**根本原因**：Inertia `Link` 嘗試向後端發送 XHR 請求，但 SSG 模式下沒有後端。

**解決方案**：改用 `StaticLink` 元件：

```tsx
// ❌ 不要直接使用 Inertia Link
import { Link } from '@inertiajs/react'
<Link href="/docs">文件</Link>

// ✅ 使用 StaticLink 包裝器
import { StaticLink } from '../components/StaticLink'
<StaticLink href="/docs">文件</StaticLink>
```

**StaticLink 實作**：
```tsx
// src/client/components/StaticLink.tsx
import { Link } from '@inertiajs/react'
import type { ComponentProps, ReactNode } from 'react'

type LinkProps = ComponentProps<typeof Link>

interface StaticLinkProps extends Omit<LinkProps, 'href'> {
  href: string
  children: ReactNode
}

/**
 * 偵測是否在靜態網站環境中執行
 */
export function isStaticSite(): boolean {
  if (typeof window === 'undefined') return false
  
  const hostname = window.location.hostname
  const port = window.location.port
  
  // 靜態預覽伺服器 (bun preview.ts)
  if (hostname === 'localhost' && port === '4173') return true
  
  // GitHub Pages
  if (hostname.endsWith('.github.io')) return true
  
  // 生產網域
  if (hostname === 'gravito.dev') return true
  
  // Cloudflare Pages, Vercel, Netlify
  if (hostname.endsWith('.pages.dev')) return true
  if (hostname.endsWith('.vercel.app')) return true
  if (hostname.endsWith('.netlify.app')) return true
  
  return false
}

/**
 * 智慧連結元件：靜態網站使用原生 <a>，SSR 模式使用 Inertia Link
 */
export function StaticLink({ href, children, className, ...props }: StaticLinkProps) {
  // 靜態網站模式下使用原生錨點以確保可靠導航
  if (isStaticSite()) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }

  // SSR 模式下使用 Inertia Link 進行 SPA 導航
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  )
}
```

**Vue StaticLink 實作**：
```vue
<!-- src/client/components/StaticLink.vue -->
<template>
  <component :is="linkComponent" v-bind="linkProps">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'

interface Props {
  href: string
  class?: string
  [key: string]: unknown
}

const props = defineProps<Props>()

function isStaticSite(): boolean {
  if (typeof window === 'undefined') return false
  
  const hostname = window.location.hostname
  const port = window.location.port
  
  // 靜態預覽伺服器 (bun preview.ts)
  if (hostname === 'localhost' && port === '4173') return true
  
  // 生產網域
  if (hostname.includes('github.io')) return true
  if (hostname.includes('vercel.app')) return true
  
  return false
}

const isStatic = isStaticSite()

const linkComponent = computed(() => isStatic ? 'a' : Link)
const linkProps = computed(() => {
  if (isStatic) {
    const { href, class: className, ...rest } = props
    return { href, class: className, ...rest }
  }
  return props
})
</script>
```

---

### 2. 語系路徑前綴問題

**問題**：連結缺少語系前綴（`/en/` 或 `/zh/`）導致 404 錯誤或無限重導向。

**錯誤行為範例**：
```
預期：/en/docs/guide/routing
實際：/docs/guide/routing  ← 404！
```

**解決方案**：所有語系（包括英文）都必須使用語系前綴：

```typescript
// ❌ 不要假設英文是預設且不需前綴
const prefix = locale === 'zh' ? '/zh/docs' : '/docs'

// ✅ 所有語系都包含前綴
const prefix = locale === 'zh' ? '/zh/docs' : '/en/docs'
```

**適用於**：
- 側邊欄連結生成（`DocsService.getSidebar()`）
- Markdown 連結轉換（`renderer.link`）
- 導航元件（`getLocalizedPath()`）

---

### 3. 語系切換路徑處理

**問題**：從 `/en/docs/page` 切換到中文會產生 `/zh/en/docs/page`（重複前綴）。

**根本原因**：切換器在添加新前綴時沒有移除舊前綴。

**解決方案**：先移除現有語系前綴再添加新前綴：

```typescript
// ❌ 錯誤：直接添加新語系前綴
const switchLocale = (newLang: string) => {
  const path = window.location.pathname
  if (newLang === 'zh') return `/zh${path}`  // 產生 /zh/en/docs/...
  return path
}

// ✅ 正確：先移除現有前綴
const switchLocale = (newLang: string) => {
  let path = window.location.pathname
  
  // 移除現有語系前綴
  if (path.startsWith('/en/') || path.startsWith('/en')) {
    path = path.replace(/^\/en/, '') || '/'
  } else if (path.startsWith('/zh/') || path.startsWith('/zh')) {
    path = path.replace(/^\/zh/, '') || '/'
  }
  
  // 添加新語系前綴
  if (newLang === 'zh') {
    return path === '/' ? '/zh/' : `/zh${path}`
  }
  if (newLang === 'en') {
    return path === '/' ? '/en/' : `/en${path}`
  }
  return path
}
```

---

### 4. 缺少靜態重導向

**問題**：像 `/about` 或 `/docs` 這樣的路由沒有靜態檔案，導致 404 或無限迴圈。

**解決方案**：在 `build-static.ts` 中生成重導向 HTML 檔案：

```typescript
// build-static.ts

// 建立 /about 到 /en/about 的重導向
const aboutRedirectHtml = `<!DOCTYPE html><html><head>
  <meta http-equiv="refresh" content="0; url=/en/about" />
  <script>window.location.href='/en/about';</script>
</head><body>重導向至 <a href="/en/about">/en/about</a>...</body></html>`

await mkdir(join(outputDir, 'about'), { recursive: true })
await writeFile(join(outputDir, 'about', 'index.html'), aboutRedirectHtml)

// 對其他抽象路由重複此操作：/docs、/contact 等
```

---

## ✅ 開發檢查清單

在建置靜態部署之前，請驗證：

### 連結與導航
- [ ] 所有內部連結使用 `StaticLink` 元件（而非 Inertia `Link`）
- [ ] 所有路由路徑包含語系前綴（`/en/...` 或 `/zh/...`）
- [ ] 語系切換器在添加新前綴前正確移除舊前綴
- [ ] 外部連結在適當時使用原生 `<a>` 配合 `target="_blank"`

### 靜態建置設定
- [ ] 抽象路由（`/`、`/about`、`/docs`）有重導向 HTML 檔案
- [ ] `isStaticSite()` 函數包含所有部署網域
- [ ] Sitemap 包含所有本地化 URL
- [ ] 404.html 生成時有適當的 SPA 回退處理

### 內容連結
- [ ] Markdown 內部連結使用相對路徑（`./routing.md`）
- [ ] 連結轉換器添加正確的語系前綴
- [ ] 錨點連結（`#section`）可在不重新載入頁面的情況下運作

---

## 🔧 快速參考：檔案位置

| 檔案 | 用途 |
|------|------|
| `src/client/components/StaticLink.tsx` | 智慧連結包裝器 |
| `src/client/components/Layout.tsx` | 導航、語系切換 |
| `src/services/DocsService.ts` | 側邊欄和 Markdown 連結生成 |
| `build-static.ts` | SSG 建置腳本、重導向 |

---

## 🧪 本地測試靜態建置

```bash
# 建置並預覽靜態網站
bun run build:preview

# 此命令執行：
# 1. bun run build:static  - 生成所有 HTML 檔案
# 2. bun run preview       - 在 http://localhost:4173 啟動本地伺服器

# 測試這些場景：
# - 點擊側邊欄連結（不應開啟新分頁）
# - 切換語言（URL 應正確更新）
# - 導航至 /about（應重導向至 /en/about）
# - 檢查控制台是否有錯誤
```

---

## 📐 架構摘要

```
┌─────────────────────────────────────────────────────────────┐
│                      請求流程                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  開發模式 (SSR)              靜態網站 (SSG)                   │
│  ─────────────               ──────────────                  │
│                                                              │
│  瀏覽器                       瀏覽器                          │
│     │                          │                             │
│     ▼                          ▼                             │
│  Inertia Link               原生 <a> 標籤                    │
│     │                          │                             │
│     ▼                          ▼                             │
│  XHR 請求至伺服器            直接載入 HTML                    │
│     │                          │                             │
│     ▼                          ▼                             │
│  Hono 後端                  靜態檔案伺服器                    │
│     │                          │                             │
│     ▼                          ▼                             │
│  Inertia 回應               預渲染的 HTML                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 黃金守則

1. **永遠使用 `StaticLink`** 進行內部導航
2. **永遠在所有路徑中包含語系前綴**
3. **部署前永遠使用 `bun run build:preview`** 進行測試
4. **永遠在 `build-static.ts` 中為抽象路由添加重導向**
5. **永遠不要依賴 Inertia 功能** 在純靜態頁面中

遵循這些準則可確保您的 Gravito 網站在開發和生產靜態部署中都能完美運作。
