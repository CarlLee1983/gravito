---
title: Monolith CMS
description: File-based content system with Markdown collections.
---

# Monolith CMS

Monolith turns Markdown collections into queryable content APIs, perfect for blogs, docs, and static pages.

## When to use Monolith

Use Monolith when you want content versioned alongside code.

## Highlights

- Markdown parsing
- Frontmatter (YAML) support
- Collection-based directory structure
- Fluent query API
- Works with SSG or API output

## Installation

```bash
bun add @gravito/monolith
```

## Quick Start

```ts
import { PlanetCore } from '@gravito/core'
import { OrbitContent } from '@gravito/monolith'

const core = await PlanetCore.boot({
  orbits: [OrbitContent],
  config: { content: { root: './content' } },
})
```

### Create Content

Create `./content/blog/hello-world.md`:

```md
---
title: Hello World
date: 2024-01-01
---

# Hello World
```

### Read Content

```ts
app.get('/blog/:slug', async (c) => {
  const content = c.get('content')
  const post = await content.collection('blog').slug(c.req.param('slug')).fetch()
  return c.json(post)
})
```

## List & Sort

```ts
const posts = await content.collection('blog').list()
const latest = posts.sort((a, b) => (a.meta.date > b.meta.date ? -1 : 1))
```

## Example: Blog List & Detail API

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

List response example:

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

Detail response example:

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

## Render as HTML

```ts
const post = await content.collection('blog').slug(slug).fetch()
return c.html(post.html)
```

## Example: Template Rendering

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

List page:

```html
<h1>Blog</h1>
<ul>
  <li><a href="/blog/hello-world">Hello World</a></li>
</ul>
```

Detail page:

```html
<article>
  <h1>Hello World</h1>
  <div class="content"><h1>Hello World</h1></div>
</article>
```

## Tags and Search

If frontmatter includes `tags` and `title`:

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

## Common Structure

```
content/
  blog/
    hello-world.md
    gravito-roadmap.md
  docs/
    introduction.md
```

## Next Steps

- Render with templates: [Template Engine](./template-engine.md)
- Generate static pages: [Static Site Development](./static-site-development.md)
