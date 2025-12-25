---
title: "Framework Integrations"
order: 3
---

# Framework Integration Guide

Luminosity is designed to be **Framework-agnostic**. Whether you are using Express, Photon, Fastify, or plain Node.js, you can easily integrate Luminosity to manage your sitemaps.

## Express Integration

In Express, you can use Luminosity as a middleware or a standalone controller.

### Installation

```bash
npm install express @gravito/luminosity
```

### Basic Usage

```typescript
import express from 'express'
import { SeoEngine, SeoRenderer } from '@gravito/luminosity'

const app = express()
const port = 3000

// 1. Initialize Engine
const seo = new SeoEngine({
  mode: 'incremental',
  baseUrl: 'https://example.com',
  resolvers: [], // Required, even if empty
  incremental: {
      logDir: './.luminosity'
  }
})

// Must call init()
await seo.init()

// 2. Intercept URL Changes (Middleware Example)
app.use((req, res, next) => {
    // Log directly to Luminosity when content changes
    res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300 && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
             // Derive the affected URL from req.path or body
             // seo.getStrategy().add({ url: ..., lastmod: new Date() })
        }
    })
    next()
})

// 3. Serve Sitemap
app.get('/sitemap.xml', async (req, res) => {
    const entries = await seo.getStrategy().getEntries()
    // Note: SeoRenderer requires resolvers and mode to be set
    const renderer = new SeoRenderer({ 
        baseUrl: 'https://example.com',
        mode: 'incremental',
        resolvers: []
    })
    const xml = renderer.render(entries, 'https://example.com/sitemap.xml')
    
    res.header('Content-Type', 'application/xml')
    res.send(xml)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```

## Photon Integration

If you're using Photon with modern standards (like within Gravito), integration is even simpler.

```typescript
import { Photon } from '@gravito/photon'
import { SeoEngine, SeoRenderer } from '@gravito/luminosity'

const app = new Photon()

const seo = new SeoEngine({
    mode: 'cached', // Recommended for Serverless
    baseUrl: 'https://my-photon-app.com',
    resolvers: [] // Required
})

await seo.init()

app.get('/sitemap.xml', async (c) => {
    const entries = await seo.getStrategy().getEntries()
    const renderer = new SeoRenderer({ 
        baseUrl: 'https://my-photon-app.com',
        mode: 'cached',
        resolvers: []
    })
    
    const xml = renderer.render(entries, c.req.url)
    
    return c.body(xml, 200, {
        'Content-Type': 'application/xml'
    })
})

export default app
```

## Next Steps

- Learn about [Configuration](/docs/configuration)
- Explore [CLI Tools](/docs/cli)
