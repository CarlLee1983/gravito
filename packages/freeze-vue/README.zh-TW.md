# @gravito/freeze-vue

> 🍃 @gravito/freeze SSG 模組的 Vue 3 適配器。

`@gravito/freeze-vue` 在您的 Vue 3 應用程式與 `@gravito/freeze` 靜態網站生成（SSG）引擎之間建立了無縫橋樑。它支援「混合模式」開發，讓您只需編寫一套組件程式碼，即可在動態 SPA（使用 Inertia.js）與全在地化靜態網站之間自由切換。

## 核心功能

- 🌓 **混合模式**：自動偵測環境，在靜態模式（原生 `<a>`）與動態模式（Inertia `<Link>`）導覽之間切換。
- 🌍 **語系感知**：深層整合 `@gravito/freeze`，實現路徑自動在地化與語系切換。
- 🧩 **智慧組件**：提供 `<StaticLink>` 與 `<LocaleSwitcher>`，輕鬆實現 SEO 友好的導覽。
- ⚓ **Vue 3 Composables**：透過 `useFreeze()` 響應式存取當前語系與導覽工具。
- 🔄 **完整導出**：可直接存取 `@gravito/freeze` 的核心工具（配置、偵測器、重新導向生成器）。

## 安裝

```bash
bun add @gravito/freeze-vue
```

## 快速上手

### 1. 安裝插件

在進入點檔案（如 `main.ts`）中配置插件。

```typescript
import { createApp } from 'vue'
import { FreezePlugin, defineConfig } from '@gravito/freeze-vue'
import { Link } from '@inertiajs/vue3' // 選填：用於動態模式
import App from './App.vue'

const config = defineConfig({
  staticDomains: ['example.com', 'example.github.io'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

const app = createApp(App)

// LinkComponent 為選填；若省略，則會始終使用原生 <a>
app.use(FreezePlugin, { config, LinkComponent: Link })

app.mount('#app')
```

### 2. 使用 StaticLink 進行導覽

`<StaticLink>` 會自動根據當前語系為路徑加上前綴，並處理 SPA 與靜態模式的行為差異。

```vue
<!-- Navigation.vue -->
<script setup>
import { StaticLink } from '@gravito/freeze-vue'
</script>

<template>
  <nav>
    <StaticLink href="/">首頁</StaticLink>
    <StaticLink href="/about">關於我們</StaticLink>
    <!-- skipLocalization 可跳過語系前綴 -->
    <StaticLink href="/external-resource" skipLocalization>外部連結</StaticLink>
  </nav>
</template>
```

### 3. 加入語系切換器

`<LocaleSwitcher>` 會在保持當前路徑的同時更換語言。

```vue
<!-- LanguageSelector.vue -->
<script setup>
import { LocaleSwitcher } from '@gravito/freeze-vue'
</script>

<template>
  <div>
    <LocaleSwitcher locale="en">English</LocaleSwitcher>
    <LocaleSwitcher locale="zh">繁體中文</LocaleSwitcher>
  </div>
</template>
```

### 4. 使用 `useFreeze` 處理自定義邏輯

在任何組件中響應式地存取 SSG 狀態。

```vue
<script setup>
import { useFreeze } from '@gravito/freeze-vue'

const { 
  isStatic, 
  locale, 
  getLocalizedPath, 
  navigateToLocale 
} = useFreeze()
</script>

<template>
  <div>
    <p>執行模式：{{ isStatic ? '靜態 SSG 模式' : '動態 SPA 模式' }}</p>
    <p>當前語言：{{ locale }}</p>
    
    <button @click="navigateToLocale('en')">切換至英文</button>
  </div>
</template>
```

## API 參考

### 插件：`FreezePlugin`

透過 `app.use(FreezePlugin, options)` 安裝。

| 選項 | 類型 | 描述 |
|---|---|---|
| `config` | `FreezeConfig` | 由 `defineConfig` 生成的配置對象。 |
| `LinkComponent` | `Component` | (選填) SPA 連結組件（如 Inertia Link）。 |

### 組件

#### `<StaticLink>`
| 屬性 | 類型 | 預設值 | 描述 |
|---|---|---|---|
| `href` | `string` | **必填** | 目標路徑。 |
| `skipLocalization` | `boolean` | `false` | 若為 true，則不會加上語系前綴。 |

#### `<LocaleSwitcher>`
| 屬性 | 類型 | 預設值 | 描述 |
|---|---|---|---|
| `locale` | `string` | **必填** | 目標語系代碼。 |

### Composable：`useFreeze()`

回傳以下響應式屬性與方法：

- `isStatic`: `ComputedRef<boolean>` - 若目前位於靜態域名則為 true。
- `locale`: `ComputedRef<string>` - 當前啟用的語系。
- `getLocalizedPath(path, locale?)`: 回傳在地化後的路徑字串。
- `switchLocale(newLocale)`: 回傳切換語系後的路徑（保留當前頁面）。
- `navigateToLocale(newLocale)`: 強制跳轉至新語系路徑。

## 靜態 vs 動態行為差異

| 功能 | 靜態模式 (生產環境) | 動態模式 (開發/SSR) |
|---------|-------------|--------------|
| **連結渲染** | 原生 `<a>` | Inertia `<Link>` (或提供的組件) |
| **在地化** | 基於路徑 (`/zh/about`) | 基於路徑 (`/zh/about`) |
| **導覽** | 瀏覽器全頁刷新 | SPA 客戶端跳轉 |
| **環境偵測** | 比對 `staticDomains` 或生產環境埠號 | 預設回退機制 |

## 授權

MIT © Gravito Framework
