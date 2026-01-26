# @gravito/freeze-react

> ⚛️ @gravito/freeze SSG 模組的 React 適配器

`@gravito/freeze-react` 在您的 React 應用程式與 Gravito Freeze SSG 引擎之間提供了一個無縫的橋樑。它支援智慧環境檢測、自動路徑在地化，並為使用 Inertia.js 或標準 React 的專案提供混合導航支援。

## 核心功能

- 🌍 **自動在地化**：根據當前語系上下文，自動為路徑添加語系前綴。
- 🔄 **混合導航**：在靜態部署環境中自動切換為原生 `<a>` 標籤，在動態開發環境中則使用 Inertia `<Link>`。
- 🧩 **語境感知 Hook**：可在組件樹中的任何位置存取語系狀態與在地化工具函數。
- ⚙️ **統一配置**：與核心模組共用相同的 `FreezeConfig`，確保伺服器端與客戶端行為一致。

## 安裝

```bash
bun add @gravito/freeze-react
```

## 快速上手

### 1. 使用 `FreezeProvider` 包裹應用程式

Provider 會初始化 SSG 檢測器並管理當前語系狀態。在動態模式（如開發環境）下，它可以與 Inertia.js 整合以實現 SPA 般的頁面切換。

```tsx
// App.tsx
import { FreezeProvider, defineConfig } from '@gravito/freeze-react'
import { Link } from '@inertiajs/react'

const config = defineConfig({
  staticDomains: ['example.com'],
  locales: ['en', 'zh-TW'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

function App({ locale }) {
  return (
    <FreezeProvider config={config} locale={locale} LinkComponent={Link}>
      <Layout>...</Layout>
    </FreezeProvider>
  )
}
```

### 2. 使用 `StaticLink` 進行導航

`StaticLink` 是內部導航的核心組件。它會智慧地處理路徑前綴，並根據網站當前是作為靜態導出還是動態應用程式運行，來選擇正確的底層標籤。

```tsx
// Navigation.tsx
import { StaticLink } from '@gravito/freeze-react'

function Navigation() {
  return (
    <nav>
      {/* 如果語系為 zh-TW，會自動變更為 /zh-TW/about */}
      <StaticLink href="/about">關於我們</StaticLink>
      
      {/* 針對特定路徑跳過在地化處理 */}
      <StaticLink href="/manifest.json" skipLocalization>Manifest</StaticLink>
    </nav>
  )
}
```

### 3. 添加語系切換器 `LocaleSwitcher`

渲染一個連結，在切換網站語系的同時保留當前的路徑與查詢參數。

```tsx
// Header.tsx
import { LocaleSwitcher } from '@gravito/freeze-react'

function Header() {
  return (
    <header>
      <LocaleSwitcher locale="en">English</LocaleSwitcher>
      <LocaleSwitcher locale="zh-TW">繁體中文</LocaleSwitcher>
    </header>
  )
}
```

### 4. 使用 `useFreeze` Hook

存取 SSG 工具函數以進行程式化控制或自定義組件邏輯。

```tsx
// CustomComponent.tsx
import { useFreeze } from '@gravito/freeze-react'

function CustomComponent() {
  const { isStatic, locale, getLocalizedPath, navigateToLocale } = useFreeze()

  return (
    <div>
      <p>部署模式：<strong>{isStatic ? '靜態 (SSG)' : '動態 (SSR)'}</strong></p>
      <p>當前語系：<strong>{locale}</strong></p>
      
      <button onClick={() => navigateToLocale('zh-TW')}>
        切換至繁體中文
      </button>
    </div>
  )
}
```

## API 參考

### 組件

#### `<FreezeProvider>`

根語境 Provider。

| 屬性 (Prop) | 類型 | 描述 |
|------|------|-------------|
| `config` | `FreezeConfig` | SSG 配置物件。 |
| `locale` | `string?` | 手動覆蓋當前語系（對 SSR 很有幫助）。 |
| `LinkComponent` | `Component?` | 用於動態導航的 React 組件（例如 Inertia Link）。 |
| `children` | `ReactNode` | 您的應用程式。 |

#### `<StaticLink>`

| 屬性 (Prop) | 類型 | 描述 |
|------|------|-------------|
| `href` | `string` | 目標路徑。自動在地化。 |
| `skipLocalization` | `boolean?` | 若為 true，則原樣使用 `href`。 |
| `className` | `string?` | 生成元素的 CSS 類名。 |
| `...props` | `any` | 其他屬性將傳遞給底層元素。 |

#### `<LocaleSwitcher>`

| 屬性 (Prop) | 類型 | 描述 |
|------|------|-------------|
| `locale` | `string` | 要切換到的目標語系。 |
| `className` | `string?` | CSS 類名。 |
| `children` | `ReactNode?` | 預設為大寫的語系代碼。 |

### Hooks

#### `useFreeze()`

返回一個包含以下屬性的物件：

- `isStatic`: `boolean` - 若運行在生產環境的靜態網域則為 `true`。
- `locale`: `string` - 當前活躍的語系。
- `getLocalizedPath(path, locale?)`: 返回帶有適當語系前綴的路徑。
- `switchLocale(newLocale)`: 返回適配新語系的當前 URL 路徑。
- `navigateToLocale(newLocale)`: 程式化觸發導航至新語系。

## 靜態 vs 動態行為

| 情境 | 模式 | `<StaticLink>` 結果 | 導航方式 |
|----------|------|------------------------|------------|
| **生產環境 (SSG)** | 靜態 | 原生 `<a>` | 全頁重整 (Full Page Reload) |
| **開發環境 (SSR)** | 動態 | Inertia `<Link>`* | SPA 切換 |

*\*僅在為 `FreezeProvider` 提供 `LinkComponent` 時。*

## 重新匯出 (Re-exports)

為了方便起見，`@gravito/freeze-react` 重新匯出了整個 `@gravito/freeze` 核心 API，包括 `defineConfig`。

## 授權條款

MIT © Gravito Framework
