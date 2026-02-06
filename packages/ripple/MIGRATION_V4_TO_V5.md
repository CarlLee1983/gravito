# Ripple v4 → v5 Migration Guide

## Overview

Ripple v5.0 introduces **multi-runtime support**, allowing you to run the same WebSocket server code on:
- **Bun** (native WebSocket, highest performance)
- **Node.js with uWebSockets.js** (high performance)
- **Node.js with ws** (best compatibility)

This guide will help you migrate from v4.x to v5.0.

## Breaking Changes

### 1. Server Initialization

**v4.x (Bun-specific):**
```typescript
import { RippleServer } from '@gravito/ripple'

const ripple = new RippleServer({ /* config */ })
await ripple.init()

// Manual Bun.serve() setup
const server = Bun.serve({
  port: 3000,
  fetch: (req, server) => {
    if (ripple.upgrade(req, server)) return
    return new Response('Not found', { status: 404 })
  },
  websocket: ripple.getHandler(),
})
```

**v5.0 (Multi-runtime):**
```typescript
import { RippleServer } from '@gravito/ripple'

const ripple = new RippleServer({
  port: 3000,
  // Optional: specify runtime
  // runtime: 'bun' | 'node-uws' | 'node-ws'
  // If not specified, auto-detects based on environment
})

// Single method to start the server
await ripple.start()
```

### 2. Type Changes

**v4.x:**
```typescript
import type { RippleWebSocket } from '@gravito/ripple'

function handleMessage(ws: RippleWebSocket, message: string) {
  // Bun-specific ServerWebSocket type
}
```

**v5.0:**
```typescript
import type { RippleSocket } from '@gravito/ripple/engines'

function handleMessage(ws: RippleSocket, message: string) {
  // Runtime-agnostic socket interface
}
```

**Note:** `RippleWebSocket` is still available as a type alias for backward compatibility, but it's deprecated.

### 3. Configuration Changes

**New in v5.0:**
```typescript
interface RippleConfig {
  // New fields
  runtime?: 'bun' | 'node-uws' | 'node-ws'  // Runtime selection
  port?: number                              // Server port
  hostname?: string                          // Bind hostname
  
  // Existing fields (unchanged)
  path?: string
  driver?: 'local' | 'redis' | 'nats'
  authorizer?: ChannelAuthorizer
  // ... all other v4.x options still work
}
```

## Migration Steps

### Step 1: Update Dependencies

```bash
# Update to v5.0
bun add @gravito/ripple@5.0.0

# If using Node.js with uWebSockets.js
npm install uWebSockets.js@uNetworking/uWebSockets.js#v20.44.0

# If using Node.js with ws
npm install ws
```

### Step 2: Update Server Initialization

Replace your manual `Bun.serve()` setup with the new `start()` method:

**Before:**
```typescript
const ripple = new RippleServer(config)
await ripple.init()

const server = Bun.serve({
  port: 3000,
  fetch: (req, server) => {
    if (ripple.upgrade(req, server)) return
    return new Response('Not found', { status: 404 })
  },
  websocket: ripple.getHandler(),
})
```

**After:**
```typescript
const ripple = new RippleServer({
  ...config,
  port: 3000,
})

await ripple.start()
```

### Step 3: Update Type Imports (Optional)

If you're using `RippleWebSocket` in your code:

**Before:**
```typescript
import type { RippleWebSocket } from '@gravito/ripple'
```

**After:**
```typescript
import type { RippleSocket } from '@gravito/ripple/engines'
```

**Note:** This is optional. `RippleWebSocket` still works but is deprecated.

### Step 4: Update Interceptors (If Using)

If you're using message interceptors, update the context type:

**Before:**
```typescript
import type { RippleContext, RippleInterceptor } from '@gravito/ripple'

const myInterceptor: RippleInterceptor = async (ctx, next) => {
  const ws: RippleWebSocket = ctx.ws
  // ...
}
```

**After:**
```typescript
import type { RippleContext, RippleInterceptor } from '@gravito/ripple'
import type { RippleSocket } from '@gravito/ripple/engines'

const myInterceptor: RippleInterceptor = async (ctx, next) => {
  const ws: RippleSocket = ctx.ws
  // ...
}
```

## Backward Compatibility

### Deprecated APIs (Still Work in v5.0)

The following APIs are **deprecated** but still functional for backward compatibility:

1. **`ripple.upgrade(req, server)`** - Use `start()` instead
2. **`ripple.getHandler()`** - Use `start()` instead
3. **`ripple.init()`** - Use `start()` instead
4. **`RippleWebSocket` type** - Use `RippleSocket` instead

These will be removed in v6.0.

## Runtime Selection

### Auto-Detection

If you don't specify a `runtime`, Ripple will auto-detect:

```typescript
const ripple = new RippleServer({ port: 3000 })
await ripple.start()
// Automatically uses 'bun' if running in Bun
// Otherwise defaults to 'node-ws' for Node.js
```

### Explicit Selection

For better performance on Node.js, explicitly choose `node-uws`:

```typescript
const ripple = new RippleServer({
  port: 3000,
  runtime: 'node-uws', // High performance on Node.js
})
await ripple.start()
```

## Performance Considerations

### Bun (Recommended)
- **Native WebSocket** - Fastest option
- **Native pub/sub** - Zero-copy broadcasting
- **Zero overhead** - Direct C++ layer access

### Node.js with uWebSockets.js
- **High performance** - Close to Bun performance
- **Native pub/sub** - Efficient broadcasting
- **Requires compilation** - May need build tools

### Node.js with ws
- **Best compatibility** - Pure JavaScript
- **Application-layer pub/sub** - Slightly slower broadcasting
- **No compilation** - Works everywhere

## Example: Full Migration

**v4.x Code:**
```typescript
import { RippleServer } from '@gravito/ripple'

const ripple = new RippleServer({
  authorizer: async (channel, userId) => {
    if (channel.startsWith('private-')) {
      return userId !== undefined
    }
    return true
  },
  driver: 'redis',
  redis: { host: 'localhost', port: 6379 },
})

await ripple.init()

const server = Bun.serve({
  port: 3000,
  fetch: (req, server) => {
    if (ripple.upgrade(req, server)) return
    return new Response('Not found', { status: 404 })
  },
  websocket: ripple.getHandler(),
})

console.log('Server started on port 3000')
```

**v5.0 Code:**
```typescript
import { RippleServer } from '@gravito/ripple'

const ripple = new RippleServer({
  port: 3000,
  authorizer: async (channel, userId) => {
    if (channel.startsWith('private-')) {
      return userId !== undefined
    }
    return true
  },
  driver: 'redis',
  redis: { host: 'localhost', port: 6379 },
})

await ripple.start()

console.log('Server started on port 3000')
```

## Testing

Update your tests to use the new API:

**Before:**
```typescript
const ripple = new RippleServer({ /* config */ })
await ripple.init()
// Manual server setup...
```

**After:**
```typescript
const ripple = new RippleServer({
  port: 3000,
  /* config */
})
await ripple.start()
```

## Need Help?

- **GitHub Issues**: https://github.com/gravito-framework/gravito/issues
- **Documentation**: https://gravito.dev/docs/ripple
- **Discord**: https://discord.gg/gravito

## Summary

✅ **Replace** `init()` + manual `Bun.serve()` with `start()`  
✅ **Add** `port` to config  
✅ **Optional**: Specify `runtime` for explicit control  
✅ **Optional**: Update `RippleWebSocket` → `RippleSocket`  
✅ **Test** your application thoroughly  

The migration is straightforward and provides significant benefits:
- **Multi-runtime support** - Run on Bun or Node.js
- **Simpler API** - Single `start()` method
- **Better performance** - Optimized for each runtime
- **Future-proof** - Ready for new runtimes (Deno, etc.)
