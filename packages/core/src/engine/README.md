# Gravito Core Engine

> **The High-Performance Web Engine for Bun**

A standalone, Bun-optimized web engine extracted from the Gravito framework. Designed for developers who want maximum performance without the full framework overhead.

## Why Gravito Engine?

Universal frameworks sacrifice 20% of potential performance for cross-platform compatibility. **Gravito Engine chooses to be opinionated.** We only serve Bun, so we can unlock Bun's full potential.

### Performance Optimizations

1. **Native Offloading (Bun 1.39+)**: Automatically offloads static routes and pre-compiled middleware to Bun's SIMD-accelerated C++/Zig router.
2. **AOT Middleware Injection**: Pre-compiles middleware chains into single functions to eliminate runtime traversal and microtask overhead.
3. **Object Pooling**: Zero-allocation request handling through `FastContext` reuse.
4. **Microtask Elimination**: Uses `Bun.peek()` to execute synchronous handlers without event loop overhead.
5. **Deferred Stream Release**: Guaranteed IoC resource cleanup and pool safety for Streaming responses (SSE/WebSocket).

## 📊 Observability & Monitoring

### Route Pattern Support (v2.0.0+)

To prevent high cardinality in Prometheus metrics, Gravito Engine automatically detects the `routePattern` and exposes it via `c.req.routePattern`.

### Benchmark Goals

- **Static routes**: Bypasses JS entry point (Native SIMD speed)
- **Dynamic routes**: 25%+ faster than Hono
- **Memory per request**: Zero JS heap allocation (via pooling)

## Installation

```bash
bun add @gravito/core
```

## Quick Start

```typescript
import { Gravito } from '@gravito/core/engine'

const app = new Gravito()

// Static route (Automatically offloaded to Native Router)
app.get('/', (c) => c.json({ message: 'Hello, World!' }))

// Dynamic route (AOT compiled)
app.get('/users/:id', (c) => c.json({ userId: c.req.param('id') }))

// Start server with optimized native configuration
export default app.serveConfig({
  port: 3000
})
```

### Response Helpers

```typescript
// JSON (Uses native Response.json() optimization)
c.json({ message: 'Hello' }, 200)

// Binary (Optimized for CBOR/Protobuf via Bun.ArrayBufferSink)
c.binary(new Uint8Array([...]), 200)

// HTML (SIMD-accelerated escape available via c.escape())
c.html('<h1>Hello</h1>', 200)

// Streaming (Zero-copy kernel transfer via direct streams)
c.stream(readableStream, 200)
```

## Advanced Usage

### Optimized TLS (Bun 1.39+)

Gravito automatically optimizes TLS by using `Bun.file()` for zero-copy certificate loading and enabling `lowMemoryMode` in production.

```typescript
export default app.serveConfig({
  port: 443,
  tls: {
    key: "./key.pem",
    cert: "./cert.pem"
  }
})
```

### Deferred Pooling & IoC Cleanup

Gravito guarantees 100% resource cleanup even for streaming responses. The context is only returned to the pool after the stream is fully consumed or the client disconnects.

```typescript
app.get('/events', (c) => {
  const stream = new ReadableStream({ ... })
  // IoC resources (scoped services) are cleaned up AFTER stream ends
  return c.stream(stream)
})
```

### Middleware

```typescript
// Global middleware
app.use(async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
})

// Path-based middleware
app.use('/api/*', async (c, next) => {
  c.header('X-API-Version', '1.0')
  await next()
})

// Route-specific middleware
app.get(
  '/protected',
  async (c, next) => {
    // Auth middleware
    const token = c.req.header('Authorization')
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    await next()
  },
  (c) => {
    // Handler
    return c.json({ secret: 'data' })
  }
)
```

### Error Handling

```typescript
// Custom error handler
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({ error: err.message }, 500)
})

// Custom 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})
```

### Headers

```typescript
// Get request header
const auth = c.req.header('Authorization')

// Set response header
c.header('X-Custom', 'value')
```

## Migration from Hono

Gravito Engine is 99% API-compatible with Hono. Most Hono code works without changes:

```typescript
// Hono
import { Hono } from 'hono'
const app = new Hono()

// Gravito Engine
import { Gravito } from '@gravito/core/engine'
const app = new Gravito()

// Everything else is the same!
```

### Key Differences

1. **Import path**: `@gravito/core/engine` instead of `hono`
2. **Class name**: `Gravito` instead of `Hono`
3. **Bun-only**: No Node.js or Deno support (by design)

## Performance Tips

### 1. Use Static Routes When Possible

Static routes use O(1) Map lookup instead of tree traversal:

```typescript
// ✅ Fast (static)
app.get('/api/users', handler)

// ⚠️ Slower (dynamic)
app.get('/api/:resource', handler)
```

### 2. Minimize Middleware

Each middleware adds overhead. Combine when possible:

```typescript
// ❌ Multiple middleware
app.use(logger)
app.use(cors)
app.use(auth)

// ✅ Combined middleware
app.use(async (c, next) => {
  // Log
  console.log(c.req.path)
  // CORS
  c.header('Access-Control-Allow-Origin', '*')
  // Auth
  if (!c.req.header('Authorization')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})
```

### 3. Avoid Unnecessary Parsing

Only parse what you need:

```typescript
// ❌ Parse entire body when you only need one field
const body = await c.req.json()
const id = body.id

// ✅ Better: Use query params for simple data
const id = c.req.query('id')
```

## Advanced Usage

### Custom Pool Size

For high-traffic applications, increase the pool size:

```typescript
const app = new Gravito({
  poolSize: 512  // Default: 256
})
```

### Access Raw Request

```typescript
app.get('/raw', (c) => {
  const rawRequest = c.req.raw
  // Do something with native Request object
  return c.json({ ok: true })
})
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
import type { FastContext, Handler } from '@gravito/core/engine'

const handler: Handler = (c: FastContext) => {
  return c.json({ message: 'Typed!' })
}

app.get('/', handler)
```

## Examples

See the `examples/` directory for more examples:

- `examples/engine-simple.ts` - Basic usage
- `examples/engine-benchmark.ts` - Performance comparison (coming soon)

## Benchmarks

Coming soon! We'll provide transparent benchmarks comparing Gravito Engine with:

- Hono
- Elysia
- Native Bun.serve

## License

MIT

## Contributing

Contributions welcome! Please read our contributing guidelines first.

---

**Built with ❤️ for the Bun community**
