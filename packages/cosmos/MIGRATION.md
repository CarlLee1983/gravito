# Migration Guide: Cosmos v1.x → v2.0

## Overview

Cosmos v2.0 introduces Edge Runtime support while maintaining full backward compatibility with v1.x. This guide helps you migrate to v2.0 and leverage new features.

## Breaking Changes

**None!** v2.0 is fully backward compatible with v1.x.

All existing code will continue to work without modifications.

## What's New in v2.0

### Edge Runtime Support

Cosmos now runs in Edge Runtime environments:
- ✅ Cloudflare Workers
- ✅ Vercel Edge Functions
- ✅ Deno Deploy
- ✅ Node.js (existing support)

### New Loaders

- **MemoryLoader**: Static translations for Edge environments
- **EdgeKVLoader**: Generic KV storage abstraction
- **CloudflareKVLoader**: Cloudflare Workers KV
- **VercelKVLoader**: Vercel KV

### Runtime Detection

- `detectRuntime()`: Auto-detect execution environment
- `isNode()`, `isEdge()`: Helper functions

## Migration Paths

### For Node.js Projects

**No changes required!** Your existing code works as-is.

```typescript
// ✅ This still works
import { OrbitCosmos } from '@gravito/cosmos'

const cosmos = new OrbitCosmos({
  defaultLocale: 'zh-TW',
  supportedLocales: ['zh-TW', 'en'],
  lazyLoad: {
    baseDir: './lang'
  }
})
```

### For Edge Runtime Projects

#### Option 1: Static Translations (Recommended for <100KB)

```typescript
// Before: Not possible
// After: Use MemoryLoader
import { OrbitCosmos, MemoryLoader } from '@gravito/cosmos/edge'
import en from './lang/en.json'
import zhTW from './lang/zh-TW.json'

const cosmos = new OrbitCosmos({
  defaultLocale: 'zh-TW',
  supportedLocales: ['zh-TW', 'en'],
  loaders: [
    new MemoryLoader({
      translations: { en, 'zh-TW': zhTW }
    })
  ]
})
```

#### Option 2: Remote API (Recommended for dynamic content)

```typescript
import { OrbitCosmos, RemoteLoader } from '@gravito/cosmos/edge'

const cosmos = new OrbitCosmos({
  defaultLocale: 'zh-TW',
  supportedLocales: ['zh-TW', 'en'],
  loaders: [
    new RemoteLoader({
      url: 'https://api.example.com/i18n/:locale',
      etagCache: true,
      retries: 3
    })
  ]
})
```

#### Option 3: KV Storage (Recommended for Cloudflare/Vercel)

**Cloudflare Workers:**

```typescript
import { OrbitCosmos, CloudflareKVLoader } from '@gravito/cosmos/edge'

export interface Env {
  I18N_KV: KVNamespace
}

export default {
  async fetch(request: Request, env: Env) {
    const cosmos = new OrbitCosmos({
      defaultLocale: 'zh-TW',
      supportedLocales: ['zh-TW', 'en'],
      loaders: [
        new CloudflareKVLoader({
          namespace: env.I18N_KV
        })
      ]
    })

    // ... use cosmos
  }
}
```

**Vercel Edge Functions:**

```typescript
import { OrbitCosmos, VercelKVLoader } from '@gravito/cosmos/edge'
import { kv } from '@vercel/kv'

const cosmos = new OrbitCosmos({
  defaultLocale: 'zh-TW',
  supportedLocales: ['zh-TW', 'en'],
  loaders: [
    new VercelKVLoader({ kv })
  ]
})
```

## Best Practices

### 1. Use Fallback Chains

Combine loaders for reliability:

```typescript
import { MemoryLoader, RemoteLoader, CloudflareKVLoader } from '@gravito/cosmos/edge'

const cosmos = new OrbitCosmos({
  loaders: [
    new CloudflareKVLoader({ namespace: env.I18N_KV })
      .fallback(new RemoteLoader({ url: env.I18N_API }))
      .fallback(new MemoryLoader({ translations: fallbackData }))
  ]
})
```

### 2. Choose the Right Loader

| Scenario | Recommended Loader | Reason |
|----------|-------------------|--------|
| Small static translations (<100KB) | MemoryLoader | Fastest, no network |
| Dynamic CMS translations | RemoteLoader | Real-time updates |
| Cloudflare Workers | CloudflareKVLoader | Edge-optimized |
| Vercel Edge | VercelKVLoader | Edge-optimized |
| Node.js server | FileSystemLoader | Native fs access |

### 3. Optimize Bundle Size

Edge environments have size limits:

```typescript
// ✅ Good: Import only what you need
import { OrbitCosmos, MemoryLoader } from '@gravito/cosmos/edge'

// ❌ Avoid: Importing Node.js-only features in Edge
import { FileSystemLoader } from '@gravito/cosmos/node'
```

## Deprecated Features

### lazyLoad.loader (Still works, but deprecated)

```typescript
// ⚠️ Deprecated
{
  lazyLoad: {
    baseDir: './lang',
    loader: customLoaderFn
  }
}

// ✅ Recommended
{
  loaders: [
    new FileSystemLoader({ baseDir: './lang' })
  ]
}
```

## Troubleshooting

### Error: "FileSystemLoader requires Node.js"

**Cause**: Using FileSystemLoader in Edge Runtime

**Solution**: Use MemoryLoader, RemoteLoader, or EdgeKVLoader

```typescript
// ❌ Wrong
import { FileSystemLoader } from '@gravito/cosmos/edge'

// ✅ Correct
import { MemoryLoader } from '@gravito/cosmos/edge'
```

### Warning: "HMR is not supported in Edge Runtime"

**Cause**: HMRWatcher is Node.js-only

**Solution**: Use RemoteLoader with ETag caching for dynamic updates

```typescript
// Edge Runtime alternative to HMR
new RemoteLoader({
  url: 'https://api.example.com/i18n/:locale',
  etagCache: true // Automatically refetches when content changes
})
```

### Translations not loading

**Debug steps:**

1. Check loader configuration
2. Verify translations are uploaded (for KV loaders)
3. Check network requests (for RemoteLoader)
4. Enable verbose logging

```typescript
const loader = new RemoteLoader({
  url: 'https://api.example.com/i18n/:locale',
  // Add console.log in load method for debugging
})

console.log('Testing load:', await loader.load('en'))
```

## Examples

### Cloudflare Workers Complete Example

```typescript
import { OrbitCosmos, CloudflareKVLoader, MemoryLoader } from '@gravito/cosmos/edge'

export interface Env {
  I18N_KV: KVNamespace
}

// Fallback translations
const fallback = {
  en: { error: 'An error occurred' },
  'zh-TW': { error: '發生錯誤' }
}

export default {
  async fetch(request: Request, env: Env) {
    const cosmos = new OrbitCosmos({
      defaultLocale: 'zh-TW',
      supportedLocales: ['zh-TW', 'en'],
      loaders: [
        new CloudflareKVLoader({ namespace: env.I18N_KV })
          .fallback(new MemoryLoader({ translations: fallback }))
      ]
    })

    const i18n = cosmos.clone('zh-TW')
    await i18n.ensureLocale('zh-TW')

    return new Response(i18n.t('welcome'))
  }
}
```

### Vercel Edge Functions Complete Example

```typescript
import { OrbitCosmos, VercelKVLoader } from '@gravito/cosmos/edge'
import { kv } from '@vercel/kv'

const cosmos = new OrbitCosmos({
  defaultLocale: 'zh-TW',
  supportedLocales: ['zh-TW', 'en'],
  loaders: [
    new VercelKVLoader({ kv, prefix: 'i18n' })
  ]
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const locale = url.searchParams.get('lang') || 'zh-TW'

  const i18n = cosmos.clone(locale)
  await i18n.ensureLocale(locale)

  return new Response(JSON.stringify({
    message: i18n.t('welcome'),
    locale: i18n.getLocale()
  }))
}
```

## FAQ

**Q: Do I need to update my code for v2.0?**
A: No, v2.0 is fully backward compatible.

**Q: Can I use FileSystemLoader in Edge Runtime?**
A: No, use MemoryLoader, RemoteLoader, or EdgeKVLoader instead.

**Q: How do I upload translations to KV storage?**
A: See the CloudflareKVLoader and VercelKVLoader documentation for upload scripts.

**Q: What's the performance difference between loaders?**
A: MemoryLoader (fastest) > KV Loaders (fast) > RemoteLoader (depends on network)

**Q: Can I mix Node.js and Edge loaders?**
A: In Node.js, yes. In Edge, only Edge-compatible loaders work.

## Support

- Documentation: [README.md](./README.md)
- Architecture: [docs/architecture/cosmos.md](../../docs/architecture/cosmos.md)
- Issues: [GitHub Issues](https://github.com/gravito-framework/gravito/issues)
