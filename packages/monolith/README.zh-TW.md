# @gravito/monolith

> Gravito 的檔案式 CMS，將 Markdown 內容轉成 API。

## 安裝

```bash
bun add @gravito/monolith
```

## 快速開始

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitContent } from '@gravito/monolith'

const core = new PlanetCore()

core.boot({
  orbits: [OrbitContent],
  config: {
    content: {
      root: './content',
    }
  }
})
```

```typescript
app.get('/blog/:slug', async (c) => {
  const content = c.get('content')
  const post = await content.collection('blog').slug(c.req.param('slug')).fetch()
  return c.json(post)
})
```
