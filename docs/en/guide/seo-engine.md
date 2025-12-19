# 🛰️ SmartMap SEO Engine

Traditional Single-Page Applications (SPAs) are often "invisible" to search engines because they rely heavily on client-side rendering. Gravito's **SmartMap SEO Engine** solves this by managing Meta tags, Sitemaps, and Analytics centrally on the server.

---

## 🚀 The Three "Gravity" Modes

The SEO engine can be configured in three modes depending on your scale and traffic.

| Mode | Use Case | How it Works |
|------|----------|--------------|
| **`dynamic`** | Small/Medium sites | Generates Sitemap on every request. Data is always 100% fresh. |
| **`cached`** | High-traffic sites | Keeps Sitemap in memory and refreshes after a TTL (time-to-live). |
| **`incremental`**| Millions of URLs | Uses **LSM-tree** principle. Updates are appended to a log and compacted in the background. Zero memory pressure. |

---

## 🛠️ Step-by-Step Integration

### 1. Define Your Configuration
The core of the SEO engine is organized into `resolvers`. We support three "babysitter-level" ways to find your URLs:

#### A. Static URLs (Simple list)
Best for fixed pages like Home, Contact, or Pricing.

#### B. Dynamic URLs (From Database/API)
Best for blog posts, products, or user profiles.

#### C. Automatic Discovery (Route Scanning)
Gravito can automatically scan your router for all static `GET` routes. This is the ultimate "set and forget" feature.

```typescript
// src/config/seo.ts
import { routeScanner } from '@gravito/orbit-sitemap' 
import { router } from '../routes'

export const seoConfig: SeoConfig = {
  mode: 'dynamic',
  baseUrl: 'https://your-app.com',
  resolvers: [
    // 1. Automatic Discovery - Scans all your defined routes
    {
      name: 'router-scanner',
      fetch: () => routeScanner(router, { 
        exclude: ['/api/*', '/admin/*', '/dashboard/*'] 
      }).getEntries()
    },
    // 2. Dynamic Data - Fetch content from your database
    {
      name: 'blog-posts',
      fetch: async () => {
        const posts = await db.posts.all()
        return posts.map(p => ({ 
          url: `/blog/${p.slug}`, 
          lastmod: p.updatedAt,
          changefreq: 'weekly',
          priority: 0.8
        }))
      }
    },
    // 3. Static List - Manually defined important URLs
    {
      name: 'promotions',
      fetch: () => [
        { url: '/black-friday', priority: 1.0 },
        { url: '/summer-sale', priority: 0.9 }
      ]
    }
  ],
  analytics: {
    gtag: 'G-XXXXXXXXXX',
  }
}
```

### 2. Connect the Orbit (Middleware)
Register the SEO middleware at your application entry point. It will automatically handle `/sitemap.xml` and `/robots.txt`.

```typescript
// src/index.ts
import { gravitoSeo } from '@gravito/seo-adapter-hono'
import { seoConfig } from './config/seo'

app.use('*', gravitoSeo(seoConfig))
```

### 3. Dynamic Meta Tags in Controllers
Inject dynamic meta tags for social media sharing directly from your controllers.

```typescript
// src/controllers/PostController.ts
import { SeoMetadata } from '@gravito/seo-core'

export class PostController {
  show(c: Context) {
    const post = // ... fetch your data
    
    const seo = new SeoMetadata({
      meta: { title: post.title, description: post.summary },
      og: { title: post.title, type: 'article', image: post.coverImage }
    })

    return c.get('inertia').render('Post', { 
      post, 
      seoHtml: seo.toString() // Pass to your frontend layout
    })
  }
}
```

---

## 📊 Analytics & Tracking
Gravito handles the heavy lifting of script injection. Simply define your IDs in the configuration:

- `gtag`: Google Analytics 4
- `pixel`: Meta (Facebook) Pixel
- `baidu`: Baidu Tongji ID

Calling `seo.toString()` will automatically include the required non-blocking scripts.

## 🛠️ Enterprise Architecture
For sites with over 50,000 URLs, Gravito automatically generates a **Sitemap Index** and splits the entries into multiple paginated files, strictly following Google's best practices.

> **Final Step**: Ready to go live? Check out the [Deployment Guide](/en/docs/guide/deployment).
