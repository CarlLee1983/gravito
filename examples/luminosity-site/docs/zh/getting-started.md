---
title: 快速開始
order: 2
---

# 快速開始

本指南將帶領您在 5 分鐘內將 Luminosity 整合至您的 Gravito 專案中。

## 安裝

首先，請使用您慣用的套件管理器安裝 `@gravito/luminosity`：

```bash
bun add @gravito/luminosity
# 或
npm install @gravito/luminosity
```

## 初始化

Luminosity 提供了一個方便的 CLI 工具來幫助您初始化設定。

```bash
bunx lux init
```

這將會執行以下操作：
1. 在專案根目錄建立 `luminosity.config.ts` 設定檔。
2. 在 `package.json` 中加入 `lux` 相關的 script。
3. 建立預設的 robots.txt 模板。

## 基礎配置

打開 `luminosity.config.ts`，您會看到類似以下的配置：

```typescript
import { defineConfig } from '@gravito/luminosity'

export default defineConfig({
  siteUrl: 'https://example.com',
  changefreq: 'daily',
  priority: 0.7,
  sitemap: {
    path: 'public/sitemap.xml',
    limit: 50000 // Google 的限制
  }
})
```

## 加入您的第一個 URL

您可以在應用程式的啟動流程中，或者透過 CLI 手動加入 URL：

```typescript
import { Luminosity } from '@gravito/luminosity'

const lux = new Luminosity()

await lux.add('/products/awesome-shoe', {
  lastmod: new Date(),
  priority: 0.9,
  changefreq: 'hourly'
})
```

或者使用 CLI：

```bash
bun lux add /products/awesome-shoe --priority 0.9
```

## 產生 Sitemap

當您累積了一些 URL 後，您可以執行以下指令來產生最終的 Sitemap 檔案：

```bash
bun lux compact
```

這將會讀取所有的變更紀錄，並產生優化過的 `sitemap.xml`。

恭喜！您已經成功踏出了 SEO 優化的第一步。
