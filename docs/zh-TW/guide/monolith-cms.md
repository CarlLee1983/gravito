---
title: Monolith CMS
description: 使用 Markdown 集合的檔案式內容系統。
---

# Monolith CMS

Monolith 讓 Markdown 集合成為可查詢的內容 API，適合部落格、文件與靜態頁面。

## 適用情境

當你希望內容與程式碼一起版本控制時，Monolith 是輕量的選擇。

## 安裝

```bash
bun add @gravito/monolith
```

## 快速開始

```ts
import { PlanetCore } from 'gravito-core'
import { OrbitContent } from '@gravito/monolith'

const core = await PlanetCore.boot({
  orbits: [OrbitContent],
  config: { content: { root: './content' } },
})
```

### 建立內容

```md
---
title: Hello World
---

# Hello World
```

### 讀取內容

```ts
app.get('/blog/:slug', async (c) => {
  const content = c.get('content')
  const post = await content.collection('blog').slug(c.req.param('slug')).fetch()
  return c.json(post)
})
```

## 下一步

- 以樣板引擎渲染：[樣板引擎](./template-engine.md)
- 生成靜態頁面：[靜態網站開發](./static-site-development.md)
