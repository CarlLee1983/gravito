# @gravito/luminosity

> Gravito SmartMap Engine™ 的核心，提供 sitemap、robots.txt 與 meta 標籤產生；其中 sitemap 生成底層由 Constellation 提供。

## 安裝

```bash
bun add @gravito/luminosity
```

## 快速開始

```typescript
import type { SeoConfig } from '@gravito/luminosity'

const config: SeoConfig = {
  mode: 'incremental',
  baseUrl: 'https://example.com',
  resolvers: [ /* ... */ ],
  incremental: {
    logDir: './storage/seo',
    compactInterval: 3600000
  }
}
```
