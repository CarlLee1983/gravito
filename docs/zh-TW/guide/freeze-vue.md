---
title: Freeze Vue
description: Freeze 的 Vue 綁定與靜態連結工具。
---

# Freeze Vue

Freeze Vue 提供 `@gravito/freeze` 的 Vue 綁定，包含 `FreezePlugin`、`StaticLink` 與語系輔助工具。

## 特色

- Static / Dynamic 模式自動切換
- 靜態站連結自動語系化
- 內建 Locale Switcher 與 Hook
- 支援 Vue SFC 與 Composition API

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

## Static / Dynamic 模式

靜態站環境時，`StaticLink` 會輸出 `<a>`；開發模式下會輸出 Inertia Link。

## Vue SFC 範例

```html
<template>
  <div>
    <StaticLink href="/about">About</StaticLink>
    <LocaleSwitcher locale="zh">中文</LocaleSwitcher>
  </div>
</template>

<script setup lang="ts">
import { StaticLink, LocaleSwitcher, useFreeze } from '@gravito/freeze-vue'

const { locale, navigateToLocale } = useFreeze()
</script>
```

## 主要 API

- `FreezePlugin` 註冊 config 與語系工具
- `StaticLink` 提供靜態站點的語系化連結
- `LocaleSwitcher` 可維持路徑切換語系

## 常見情境

- 多語系文件站
- 靜態站點的語系切換
- 同一套程式碼支援 SSR / SSG

## 下一步

- 建立靜態站點：[靜態網站開發](./static-site-development.md)
