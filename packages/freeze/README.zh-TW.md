# @gravito/freeze 🧊

> **Gravito 框架的高效能靜態網站生成 (SSG) 核心模組。**

`@gravito/freeze` 是 Gravito 靜態網站功能的骨幹。它提供了環境偵測、多語系路由以及構建時資源生成的必要邏輯，讓您能將 Gravito 應用程式轉換為對 SEO 友善且極速的靜態網站。

## 🌟 特性

- **⚡️ 智慧偵測**：自動判別應用程式目前是作為靜態網站還是動態應用程式運行。
- **🌍 多語系路由**：原生支援多國語言站點，具備自動化的語系路徑生成與重定向功能。
- **🏗️ 構建工具集**：
  - **Sitemap 生成**：自動產生支援 `hreflang` 的 `sitemap.xml`。
  - **Robots 管理**：以程式化方式生成標準的 `robots.txt`。
  - **重定向邏輯**：為無伺服器靜態託管（如 GitHub Pages, Vercel）生成基於 HTML 的重定向頁面。
- **🔍 SEO 優化**：專為搜尋引擎設計，確保您的靜態內容能被完善地索引。
- **🔌 框架無關**：核心邏輯使用純 TypeScript 編寫，並提供 React 與 Vue 的官方適配器。
- **🛠️ 配置驅動**：具備合理的預設值，並對網域、語系及輸出路徑提供深度自定義選項。

## 📦 安裝

```bash
bun add @gravito/freeze
```

## 🚀 快速上手

定義您的配置並初始化偵測器：

```typescript
import { defineConfig, createDetector } from '@gravito/freeze'

const config = defineConfig({
  baseUrl: 'https://gravito.dev',
  locales: ['en', 'zh-TW', 'ja'],
  defaultLocale: 'en',
  staticDomains: ['gravito.dev', 'gravito-framework.github.io'],
  redirects: [
    { from: '/docs', to: '/en/docs/introduction' }
  ]
})

const detector = createDetector(config)

// 使用偵測器來決定渲染行為
if (detector.isStaticSite()) {
  // 靜態網站邏輯（例如：使用原生 <a> 標籤）
}
```

## ⚙️ 核心概念

### 1. 環境偵測 (Environment Detection)
`FreezeDetector` 透過網域匹配與環境變數來判斷應用程式是否正以靜態形式提供服務。這讓您的組件能自動調整其行為（如導航方式）。

### 2. 本地化 (I18n)
Freeze 處理了複雜的多語系路徑邏輯：
- `/about` → `/en/about`
- `/zh-TW/docs` → `/ja/docs` (切換語系)
它還會生成必要的元數據，讓搜尋引擎理解不同語言頁面之間的關聯。

### 3. 靜態託管重定向
由於許多靜態空間不支援伺服器端重定向，Freeze 可以生成實體的 `index.html` 檔案，透過 `<meta http-equiv="refresh">` 與 JavaScript 回退方案來處理舊路徑或根目錄跳轉。

## 🛠️ API 參考

### 配置：`defineConfig`

| 選項 | 類型 | 預設值 | 描述 |
|---|---|---|---|
| `baseUrl` | `string` | 必填 | 網站的正式生產環境 URL。 |
| `locales` | `string[]` | `['en']` | 支援的語言代碼列表。 |
| `defaultLocale` | `string` | `'en'` | 預設的回退語言。 |
| `outputDir` | `string` | `'dist-static'` | 生成檔案的目標目錄。 |
| `staticDomains` | `string[]` | `[]` | 會觸發靜態模式的網域列表。 |

### 構建工具 (Build Utilities)

- `generateSitemapXml`：建立包含替代連結的標準 XML 網站地圖。
- `generateRobotsTxt`：建立標準的 `robots.txt`。
- `generateRedirects`：生成檔案路徑與重定向 HTML 內容的對應表。
- `generate404Html`：為靜態空間建立標準的 404 頁面。

## 🔌 框架適配器

為了與您的 UI 函式庫無縫整合，請使用我們的官方適配器：

- **React**: `@gravito/freeze-react` (提供 `useLocale`, `useLocalizedPath` 等 Hooks)
- **Vue**: `@gravito/freeze-vue` (提供具備相同功能的 Composables)

## 📄 授權

MIT © Carl Lee
