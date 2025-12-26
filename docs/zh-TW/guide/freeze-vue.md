---
title: Freeze Vue
description: Freeze 的 Vue 綁定與靜態連結工具。
---

# Freeze Vue

Freeze Vue 提供 `@gravito/freeze` 的 Vue 綁定，包含 `FreezePlugin`、`StaticLink` 與語系輔助工具。

## 安裝

```bash
bun add @gravito/freeze-vue
```

## 快速開始

```ts
import { createApp } from 'vue'
import { FreezePlugin, defineConfig } from '@gravito/freeze-vue'
import App from './App.vue'

const config = defineConfig({
  staticDomains: ['example.com'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

createApp(App).use(FreezePlugin, config).mount('#app')
```

## 主要 API

- `FreezePlugin` 註冊 config 與語系工具
- `StaticLink` 提供靜態站點的語系化連結
- `LocaleSwitcher` 可維持路徑切換語系

## 下一步

- 建立靜態站點：[靜態網站開發](./static-site-development.md)
