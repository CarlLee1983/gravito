---
title: Freeze React
description: Freeze 的 React 綁定與靜態連結工具。
---

# Freeze React

Freeze React 提供 `@gravito/freeze` 的 React 綁定，包含 `FreezeProvider`、`StaticLink` 與語系輔助工具。

## 特色

- Static / Dynamic 模式自動切換
- 靜態站連結自動語系化
- 內建 Locale Switcher 與 Hook
- 支援自訂語系邏輯

## 安裝

```bash
bun add @gravito/freeze-react
```

## 快速開始

```ts
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

## Static / Dynamic 模式

當在靜態站環境時，`StaticLink` 會輸出一般 `<a>`；在動態/開發模式下會輸出 Inertia Link。

```ts
const { isStatic } = useFreeze()
```

## Hook 範例

```ts
import { useFreeze } from '@gravito/freeze-react'

const { locale, getLocalizedPath, navigateToLocale } = useFreeze()
```

## 主要 API

- `FreezeProvider` 設定 config 與語系 context
- `StaticLink` 提供靜態站點的語系化連結
- `LocaleSwitcher` 可維持路徑切換語系

## 常見情境

- 多語系文件站
- 靜態站點的語系切換
- 同一套程式碼支援 SSR / SSG

## 下一步

- 建立靜態站點：[靜態網站開發](./static-site-development.md)
