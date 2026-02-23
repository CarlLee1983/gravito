# Astral File System Router Integration

Learn how to use Bun's File System Router with Gravito's Astral static site generator.

Reference: [Bun FileSystemRouter](https://bun.sh/docs/runtime/file-system-router)

---

## Overview

Astral now includes built-in File System Router support for managing routes based on your page file structure. This enables:

- **Automatic Route Detection** - Routes based on filesystem structure
- **Dynamic Parameters** - Extract route params from filenames (e.g., `[slug]`)
- **Static Site Generation** - Pre-generate routes efficiently
- **URL Mapping** - Convert routes to absolute URLs
- **Development & Production Modes** - Different configurations per environment

---

## Quick Start

### Basic Setup

```typescript
import { createAstralRouter } from '@gravito/astral/routing';

const router = createAstralRouter({
  dir: './pages',
  origin: 'https://example.com',
});

// Match a route
const match = router.match('/blog/hello-world');
console.log(match?.params.slug); // "hello-world"
```

### Directory Structure

```
pages/
├── index.tsx                 → /
├── about.tsx                 → /about
├── blog/
│   ├── index.tsx             → /blog
│   └── [slug].tsx            → /blog/:slug
├── docs/
│   └── [...path].tsx         → /docs/* (catch-all)
└── [...catchall].tsx         → /* (root catch-all)
```

---

## Configuration

### AstralRouterConfig

```typescript
interface AstralRouterConfig {
  // Pages directory to scan for routes
  dir: string;

  // Base URL or domain
  origin: string;

  // Prefix for static assets (optional)
  assetPrefix?: string;  // default: "/"

  // File extensions to recognize (optional)
  fileExtensions?: string[];  // default: [".ts", ".tsx", ".md"]

  // Enable debug logging (optional)
  debug?: boolean;  // default: false
}
```

### Configuration Examples

**Development**
```typescript
const router = createDevRouter('./pages', 'http://localhost:3000');
// Includes debug logging
// Asset prefix: /_astral/static
```

**Production**
```typescript
const router = createProdRouter(
  './dist/pages',
  'https://example.com',
  'https://cdn.example.com/assets'
);
// No debug logging
// Custom asset prefix for CDN
```

**Custom**
```typescript
const router = createAstralRouter({
  dir: './src/pages',
  origin: 'https://mysite.com',
  assetPrefix: '/static',
  fileExtensions: ['.tsx', '.md'],
  debug: process.env.NODE_ENV === 'development',
});
```

---

## Core APIs

### Match Routes

```typescript
// Match a single path
const match = router.match('/blog/getting-started');

if (match) {
  console.log(match.pathname);  // "/blog/[slug]"
  console.log(match.params);    // { slug: "getting-started" }
  console.log(match.query);     // {} (from query string)
  console.log(match.src);       // "/path/to/pages/blog/[slug].tsx"
}
```

### Check Route Existence

```typescript
// Does this route exist?
if (router.hasRoute('/blog/my-post')) {
  console.log('Route exists');
}

// Get params for a path
const params = router.getParams('/users/123');
// { id: "123" }

// Get absolute URL
const url = router.getUrl('/blog/hello-world');
// "https://example.com/blog/hello-world"
```

### Get Route Metadata

```typescript
// Get detailed route info
const meta = router.getRouteMetadata('/blog/[slug]');

console.log(meta.pathname);    // "/blog/[slug]"
console.log(meta.isDynamic);   // true
console.log(meta.isCatchAll);  // false
console.log(meta.url);         // "https://example.com/blog/[slug]"
console.log(meta.src);         // "/path/to/pages/blog/[slug].tsx"
```

### Static Site Generation

```typescript
// Get all static routes (non-dynamic)
const staticRoutes = router.getStaticRoutes();
// ["/", "/about", "/contact", "/blog/archive"]

// Generate static files
for (const route of staticRoutes) {
  const html = await generatePage(route);
  await Bun.write(`./dist${route}.html`, html);
}

// Get all dynamic routes (for data fetching)
const dynamicRoutes = router.getDynamicRoutes();
// ["/blog/[slug]", "/docs/[...path]"]
```

### Development Watch Mode

```typescript
// Reload routes when files change
const watcher = Bun.watch('./pages', () => {
  router.reload();
  console.log('Routes reloaded');
});
```

---

## Dynamic Routes

### Single Parameter Routes

```typescript
// File: pages/blog/[slug].tsx
export default function BlogPost({ params }) {
  console.log(params.slug); // "hello-world"
}

// Access: /blog/hello-world
// Params: { slug: "hello-world" }
```

### Multiple Parameters

```typescript
// File: pages/users/[userId]/posts/[postId].tsx

// Access: /users/123/posts/456
// Params: { userId: "123", postId: "456" }
```

### Catch-All Routes

```typescript
// File: pages/docs/[...path].tsx

// Access: /docs/getting-started/installation
// Params: { path: ["getting-started", "installation"] }

// Access: /docs/api/reference
// Params: { path: ["api", "reference"] }
```

### Catch-All at Root

```typescript
// File: pages/[...catchall].tsx
// Matches everything that doesn't match other routes

// Access: /anything/here/works
// Params: { catchall: ["anything", "here", "works"] }
```

---

## Use Cases

### 1. Static Blog Generation

```typescript
import { createAstralRouter } from '@gravito/astral/routing';

async function generateBlog() {
  const router = createAstralRouter({
    dir: './pages',
    origin: 'https://myblog.com',
  });

  const staticRoutes = router.getStaticRoutes();

  for (const route of staticRoutes) {
    const html = await renderPage(route);
    const filePath = `./dist${route}/index.html`;
    await Bun.write(filePath, html);
    console.log(`Generated: ${route}`);
  }
}
```

### 2. Dynamic Data Fetching

```typescript
async function generateDynamicPages() {
  const router = createAstralRouter({
    dir: './pages',
    origin: 'https://example.com',
  });

  // Get all blog posts
  const posts = await fetchAllPosts();

  for (const post of posts) {
    // Generate path from data
    const pathname = `/blog/${post.slug}`;

    // Get route info
    const match = router.match(pathname);
    if (!match) continue;

    // Generate page
    const html = await renderBlogPost(post);
    await Bun.write(`./dist${pathname}.html`, html);
  }
}
```

### 3. Sitemap Generation

```typescript
async function generateSitemap() {
  const router = createAstralRouter({
    dir: './pages',
    origin: 'https://example.com',
  });

  const staticRoutes = router.getStaticRoutes();
  const urls = staticRoutes.map((route) => router.getUrl(route));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map((url) => `<url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;

  await Bun.write('./dist/sitemap.xml', sitemap);
}
```

### 4. API Route Discovery

```typescript
function discoverApiRoutes() {
  const router = createAstralRouter({
    dir: './pages/api',
    origin: 'http://localhost:3000',
  });

  const allRoutes = [
    ...router.getStaticRoutes(),
    ...router.getDynamicRoutes(),
  ];

  const apiRoutes = allRoutes.map((route) => ({
    method: 'GET', // Could be detected from file
    path: route,
    url: router.getUrl(route),
  }));

  return apiRoutes;
}
```

### 5. URL Rewriting

```typescript
// Rewrite old URLs to new routes
const urlMap = new Map([
  ['/old-blog/post-1', '/blog/migrated-post'],
  ['/articles', '/blog'],
]);

function rewriteUrl(oldUrl: string): string | null {
  const newUrl = urlMap.get(oldUrl);
  if (!newUrl) return null;

  const router = createAstralRouter({
    dir: './pages',
    origin: 'https://example.com',
  });

  // Verify new URL exists
  if (router.hasRoute(newUrl)) {
    return newUrl;
  }

  return null;
}
```

---

## Advanced Usage

### Custom File Extensions

```typescript
// Include Markdown files as routes
const router = createAstralRouter({
  dir: './pages',
  origin: 'https://example.com',
  fileExtensions: ['.tsx', '.md', '.mdx'],
});
```

### Asset URL Generation

```typescript
const router = createAstralRouter({
  dir: './pages',
  origin: 'https://example.com',
  assetPrefix: 'https://cdn.example.com/assets',
});

// Asset URLs automatically use the prefix
const scriptUrl = router.getUrl('/app.js');
// "https://example.com/app.js" (with proper prefix handling)
```

### Debug Logging

```typescript
const router = createAstralRouter({
  dir: './pages',
  origin: 'https://example.com',
  debug: true,
});

// Console output:
// [Astral Router] Initializing with: {...}
// [Astral Router] Matched: /blog/hello-world → /blog/[slug]
// [Astral Router] Routes reloaded
```

### Route Filtering

```typescript
// Get only published blog posts
function getPublishedRoutes(router) {
  const dynamicRoutes = router.getDynamicRoutes();

  return dynamicRoutes.filter((route) => {
    // Only include blog routes
    return route.startsWith('/blog/');
  });
}
```

---

## Integration with Build Process

### Astral Build Configuration

```typescript
// astral.config.ts
import { createProdRouter } from '@gravito/astral/routing';

export default {
  // ... astral config

  // Pre-generate static routes
  async preGenerate(config) {
    const router = createProdRouter(
      config.pagesDir,
      config.origin,
      config.cdnPrefix
    );

    const staticRoutes = router.getStaticRoutes();

    return {
      routes: staticRoutes,
      metadata: staticRoutes.map((route) =>
        router.getRouteMetadata(route)
      ),
    };
  },
};
```

### Watch Mode

```typescript
// Development server with route reloading
async function startDevServer() {
  const router = createDevRouter('./pages', 'http://localhost:3000');

  // Watch for file changes
  const watcher = Bun.watch('./pages', () => {
    router.reload();
    console.log('Routes updated');
    // Trigger rebuild
  });

  return watcher;
}
```

---

## Troubleshooting

### Routes Not Matching

**Problem**: `router.match()` returns null

```typescript
// ❌ Wrong: Incorrect path format
router.match('blog/hello-world');  // Missing leading slash

// ✅ Correct: Include leading slash
router.match('/blog/hello-world');
```

### Dynamic Parameters Not Captured

**Problem**: `params` object is empty

```typescript
// ❌ Wrong: File doesn't follow naming convention
// File: pages/blog/post.tsx

// ✅ Correct: Use [param] syntax
// File: pages/blog/[slug].tsx
```

### Asset Prefix Not Applied

**Problem**: Asset URLs don't use the configured prefix

```typescript
// ❌ Wrong: Prefix not configured
const router = createAstralRouter({
  dir: './pages',
  origin: 'https://example.com',
  // Missing assetPrefix
});

// ✅ Correct: Include assetPrefix
const router = createAstralRouter({
  dir: './pages',
  origin: 'https://example.com',
  assetPrefix: 'https://cdn.example.com/assets',
});
```

### Directory Scanning Fails

**Problem**: Routes not detected

```typescript
// ❌ Wrong: Directory doesn't exist
const router = createAstralRouter({
  dir: './pages_missing',  // Wrong directory
  origin: 'https://example.com',
});

// ✅ Correct: Use existing directory
const router = createAstralRouter({
  dir: './pages',
  origin: 'https://example.com',
});

// Enable debug to see errors
debug: true;
```

---

## Performance Considerations

1. **Route Caching**: Router caches routes; call `reload()` when files change
2. **Directory Scanning**: Large directories may take time to scan
3. **Static Generation**: Batch route generation for better performance
4. **Asset Prefixes**: CDN prefixes reduce origin server load

---

## Related Resources

- [Bun FileSystemRouter Documentation](https://bun.sh/docs/runtime/file-system-router)
- [Plugin Usage Guide](./PLUGIN_USAGE.md)
- [Runtime Features Guide](./RUNTIME_FEATURES.md)
- [Astral Documentation](../../packages/astral/README.md)

---

## Next Steps

- Integrate the router into your build process
- Set up static site generation
- Configure development watch mode
- Generate sitemaps and metadata
