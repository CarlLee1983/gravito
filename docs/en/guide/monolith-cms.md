---
title: Monolith CMS
description: File-based CMS for Gravito using Markdown collections.
---

# Monolith CMS

Monolith turns Markdown collections into a queryable content API. It is suited for blogs, docs, and static pages.

## When to use Monolith

Use Monolith if you want Git-based content that ships with your application.

## Installation

```bash
bun add @gravito/monolith
```

## Quick Start

```ts
import { PlanetCore } from 'gravito-core'
import { OrbitContent } from '@gravito/monolith'

const core = await PlanetCore.boot({
  orbits: [OrbitContent],
  config: { content: { root: './content' } },
})
```

### Create content

```md
---
title: Hello World
---

# Hello World
```

### Fetch content

```ts
app.get('/blog/:slug', async (c) => {
  const content = c.get('content')
  const post = await content.collection('blog').slug(c.req.param('slug')).fetch()
  return c.json(post)
})
```

## Next Steps

- Render content with [Template Engine](./template-engine.md)
- Publish static pages via [Static Site Development](./static-site-development.md)
