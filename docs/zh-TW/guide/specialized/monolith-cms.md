---
title: Monolith CMS
description: 使用 Markdown 集合的檔案式內容系統。
---

# Monolith CMS

Monolith 讓 Markdown 集合成為可查詢的內容 API，適合部落格、文件與靜態頁面。

## 適用情境

當你希望內容與程式碼一起版本控制時，Monolith 是輕量的選擇。

## 特色

- Markdown 內容自動解析
- Frontmatter（YAML）支援
- 集合式目錄管理（collection）
- Fluent API 查詢
- 可搭配 SSG 或 API 輸出

## 安裝

```bash
bun add @gravito/monolith
```

## 快速開始

```ts
import { PlanetCore } from '@gravito/core'
import { OrbitContent } from '@gravito/monolith'

const core = await PlanetCore.boot({
  orbits: [OrbitContent],
  config: { content: { root: './content' } },
})
```

### 建立內容

建立 `./content/blog/hello-world.md`：

```md
---
title: Hello World
date: 2024-01-01
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

## 列出內容與排序

```ts
const posts = await content.collection('blog').list()
const latest = posts.sort((a, b) => (a.meta.date > b.meta.date ? -1 : 1))
```

## 範例：部落格列表與文章詳情 API

```ts
app.get('/api/blog', async (c) => {
  const content = c.get('content')
  const posts = await content.collection('blog').list()
  const items = posts
    .map((post) => ({
      title: post.meta.title,
      date: post.meta.date,
      slug: post.meta.slug ?? post.slug,
      excerpt: post.meta.excerpt,
    }))
    .sort((a, b) => (a.date > b.date ? -1 : 1))
  return c.json(items)
})

app.get('/api/blog/:slug', async (c) => {
  const content = c.get('content')
  const post = await content.collection('blog').slug(c.req.param('slug')).fetch()
  return c.json(post)
})
```

回傳示意（列表）：

```json
[
  {
    "title": "Hello World",
    "date": "2024-01-01",
    "slug": "hello-world",
    "excerpt": "First post"
  }
]
```

回傳示意（文章詳情）：

```json
{
  "meta": {
    "title": "Hello World",
    "date": "2024-01-01"
  },
  "content": "# Hello World",
  "html": "<h1>Hello World</h1>"
}
```

## 輸出為 HTML

`fetch()` 回傳 `{ meta, content, html }`，可直接用 `html` 渲染：

```ts
const post = await content.collection('blog').slug(slug).fetch()
return c.html(post.html)
```

## 範例：搭配樣板引擎渲染

```ts
app.get('/blog', async (c) => {
  const content = c.get('content')
  const posts = await content.collection('blog').list()
  return c.render('blog/index', { posts })
})

app.get('/blog/:slug', async (c) => {
  const content = c.get('content')
  const post = await content.collection('blog').slug(c.req.param('slug')).fetch()
  return c.render('blog/show', { post })
})
```

呈現示意（列表頁）：

```html
<h1>Blog</h1>
<ul>
  <li><a href="/blog/hello-world">Hello World</a></li>
</ul>
```

呈現示意（詳情頁）：

```html
<article>
  <h1>Hello World</h1>
  <div class="content"><h1>Hello World</h1></div>
</article>
```

## 範例：標籤過濾與搜尋

假設 frontmatter 有 `tags` 與 `title`：

```md
---
title: Hello World
tags: [gravito, cms]
---
```

```ts
const posts = await content.collection('blog').list()

const byTag = posts.filter((post) => post.meta.tags?.includes('gravito'))
const byKeyword = posts.filter((post) =>
  post.meta.title?.toLowerCase().includes('hello')
)
```

## 常見結構

```
content/
  blog/
    hello-world.md
    gravito-roadmap.md
  docs/
    introduction.md
```

## 下一步

- 以樣板引擎渲染：[樣板引擎](./template-engine.md)
- 生成靜態頁面：[靜態網站開發](./static-site-development.md)
