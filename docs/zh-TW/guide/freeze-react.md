---
title: Freeze React
description: Freeze 的 React 綁定與靜態連結工具。
---

# Freeze React

Freeze React 提供 `@gravito/freeze` 的 React 綁定，包含 `FreezeProvider`、`StaticLink` 與語系輔助工具。

## 安裝

```bash
bun add @gravito/freeze-react
```

## 快速開始

```tsx
import { FreezeProvider, defineConfig, StaticLink, LocaleSwitcher } from '@gravito/freeze-react'

const config = defineConfig({
  staticDomains: ['example.com'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

export function App() {
  return (
    <FreezeProvider config={config}>
      <StaticLink href="/about">About</StaticLink>
      <LocaleSwitcher locale="zh">中文</LocaleSwitcher>
    </FreezeProvider>
  )
}
```

## 主要 API

- `FreezeProvider` 設定 config 與語系 context
- `StaticLink` 提供靜態站點的語系化連結
- `LocaleSwitcher` 可維持路徑切換語系

## 下一步

- 建立靜態站點：[靜態網站開發](./static-site-development.md)
