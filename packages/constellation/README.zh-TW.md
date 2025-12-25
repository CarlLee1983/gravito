# Constellation

> Gravito 的 Sitemap 產生器，支援動態輸出與靜態生成，可被 Luminosity 作為 sitemap 與路由掃描的工具層使用。

## 特色

- **動態 sitemap**：在執行期提供 `sitemap.xml`
- **靜態生成**：建置時輸出檔案
- **路由掃描**：自動掃描已註冊路由
- **擴充支援**：Images、Videos、News、i18n

## 安裝

```bash
bun add @gravito/constellation
```

## 快速開始

```typescript
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

OrbitSitemap.dynamic({
  baseUrl: 'https://example.com',
  providers: [
    routeScanner(core.router, {
      exclude: ['/api/*', '/admin/*'],
      defaultChangefreq: 'daily'
    })
  ],
  cacheSeconds: 3600
}).install(core)
```
