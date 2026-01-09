---
title: Site Toolkit
description: 基於 Monolith、Cosmos、Constellation 的靜態文件工具。
---

# Site Toolkit

Site Toolkit（`@gravito/site`）是以 Monolith、Cosmos 與 Constellation 組成的靜態文件工具，可用於多語系文件站。

## 特色

- Monolith 驅動的 Markdown 內容
- Cosmos 多語系管理
- Constellation sitemap 產生
- 一鍵產生靜態站

## 安裝

```bash
bun add @gravito/site
```

## 目錄建議

```
content/
  zh/
    docs/
      introduction.md
  en/
    docs/
      introduction.md
```

## 基本使用

```bash
# 建置執行檔
bun run build

# 生成靜態輸出
bun run generate
```

## 設定範例

```ts
import { PlanetCore } from '@gravito/core'
import { OrbitContent } from '@gravito/monolith'
import { OrbitI18n } from '@gravito/cosmos'
import { OrbitSitemap } from '@gravito/constellation'

await PlanetCore.boot({
  orbits: [
    OrbitContent,
    OrbitI18n.configure({ locales: ['zh', 'en'], defaultLocale: 'zh' }),
    OrbitSitemap.configure({ baseUrl: 'https://example.com' }),
  ],
  config: {
    content: { root: './content' },
  },
})
```

## 輸出位置

預設輸出到 `./dist`，可搭配靜態託管或 CDN 直接部署。

## 下一步

- 撰寫內容：[Monolith CMS](./monolith-cms.md)
- 設定多語系：[I18n 指南](./i18n-guide.md)
