# Gravito HTTP Abstraction - Migration Guide

> A step-by-step guide to migrating from Photon types to Gravito abstractions.

## Overview

Gravito 2.0 introduces an HTTP abstraction layer that decouples your code from the underlying HTTP engine. This enables future migration to a custom Bun-native implementation for maximum performance.

## Quick Reference

| Before (Photon) | After (Gravito) |
|---------------|-----------------|
| `import type { Context } from '@gravito/photon'` | `import type { GravitoContext } from 'gravito-core'` |
| `import type { Handler } from '@gravito/photon'` | `import type { GravitoHandler } from 'gravito-core'` |
| `import type { MiddlewareHandler } from '@gravito/photon'` | `import type { GravitoMiddleware } from 'gravito-core'` |
| `import type { Next } from '@gravito/photon'` | `import type { GravitoNext } from 'gravito-core'` |
| `c.req.param('id')` | `ctx.req.param('id')` (same API!) |
| `c.json({ data })` | `ctx.json({ data })` (same API!) |

## Migration Steps

### Step 1: Update Imports

```typescript
// Before
import type { Context, MiddlewareHandler } from '@gravito/photon'

// After
import type { GravitoContext, GravitoMiddleware } from 'gravito-core'
```

### Step 2: Update Controller Types

```typescript
// Before
import type { Context } from '@gravito/photon'

export class UserController {
  async index(c: Context) {
    return c.json({ users: await User.all() })
  }
}

// After
import type { GravitoContext } from 'gravito-core'

export class UserController {
  async index(ctx: GravitoContext) {
    return ctx.json({ users: await User.all() })
  }
}
```

### Step 3: Update Middleware Types

```typescript
// Before
import type { MiddlewareHandler, Next } from '@gravito/photon'

const logger: MiddlewareHandler = async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
}

// After
import type { GravitoMiddleware, GravitoNext } from 'gravito-core'

const logger: GravitoMiddleware = async (ctx, next) => {
  console.log(`${ctx.req.method} ${ctx.req.path}`)
  await next()
}
```

## Compatibility Mode

For gradual migration, use the compatibility layer:

```typescript
// During migration, you can use Photon-style aliases:
import type { Context, MiddlewareHandler, Next } from 'gravito-core/compat'

// Your existing code works unchanged!
export async function myMiddleware(c: Context, next: Next) {
  await next()
}
```

## Native Access (Escape Hatch)

When you need Photon-specific features not yet abstracted:

```typescript
import type { GravitoContext } from 'gravito-core'
import type { Context as PhotonContext } from '@gravito/photon'

async function advancedHandler(ctx: GravitoContext) {
  // Access the underlying Photon context
  const photonCtx = ctx.native as PhotonContext
  
  // Use Photon-specific features
  photonCtx.executionCtx.waitUntil(...)
  
  return ctx.json({ ok: true })
}
```

## API Compatibility

The `GravitoContext` API is designed to match Photon's `Context`:

| Method | Compatibility |
|--------|---------------|
| `ctx.req.param(name)` | [Complete] Identical |
| `ctx.req.query(name)` | [Complete] Identical |
| `ctx.req.header(name)` | [Complete] Identical |
| `ctx.req.json()` | [Complete] Identical |
| `ctx.req.text()` | [Complete] Identical |
| `ctx.req.formData()` | [Complete] Identical |
| `ctx.json(data, status?)` | [Complete] Identical |
| `ctx.text(text, status?)` | [Complete] Identical |
| `ctx.html(html, status?)` | [Complete] Identical |
| `ctx.redirect(url, status?)` | [Complete] Identical |
| `ctx.header(name, value)` | [Complete] Identical |
| `ctx.get(key)` | [Complete] Identical |
| `ctx.set(key, value)` | [Complete] Identical |

## Extending Variables

To add custom context variables in your Gravito:

```typescript
// In your Kinetic module
declare module 'gravito-core' {
  interface GravitoVariables {
    myService: MyService
  }
}

// Now TypeScript knows about ctx.get('myService')
```

## Benefits of Migration

1. **Future-proof**: Your code will work with any HTTP adapter
2. **Type Safety**: Full TypeScript support
3. **Performance**: Ready for Bun-native optimizations
4. **Consistency**: Unified API across the framework

## FAQ

### Q: Will my existing code break?
A: No!The migration is optional and backward compatible.

### Q: When will Photon support be deprecated?
A: No plans to deprecate. You can continue using Photon types.

### Q: How do I use Photon middleware?
A: Photon middleware continues to work via `core.app.use()`.

---

For questions, open an issue on [GitHub](https://github.com/gravito-framework/gravito).
