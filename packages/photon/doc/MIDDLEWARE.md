# Photon Middleware Guide

Middleware are functions that run before or after your route handlers. They are used for authentication, logging, header manipulation, and more.

## Table of Contents
- [Using Middleware](#using-middleware)
- [Built-in Middleware](#built-in-middleware)
  - [HTMX Middleware](#htmx-middleware)
  - [Binary Middleware (CBOR)](#binary-middleware-cbor)
  - [Logger](#logger)
- [Writing Custom Middleware](#writing-custom-middleware)

---

## Using Middleware

```typescript
// Global middleware
app.use('*', logger())

// Path-specific middleware
app.use('/api/*', auth())

// Route-specific middleware
app.get('/profile', auth(), (c) => c.json(c.get('user')))
```

---

## Built-in Middleware

### HTMX Middleware
Extends the context with HTMX-specific helpers. It detects if a request was made via HTMX and extracts relevant headers.

```typescript
import { htmxMiddleware } from '@gravito/photon'
app.use(htmxMiddleware())

app.get('/data', (c) => {
  const isHtmx = c.get('htmx')
  const target = c.get('htmx.target')
  return isHtmx ? c.html('<div>Fragment</div>') : c.html('<html>Page</html>')
})
```

### Binary Middleware (CBOR)
The Binary middleware automatically encodes JSON responses as [CBOR](https://cbor.io/) when the client sends an `Accept: application/cbor` header.

#### Performance
- **Speed**: Up to 3x faster than JSON serialization for large datasets.
- **Payload**: Reduces data size by 20-40% via binary encoding.

```typescript
import { binaryMiddleware } from '@gravito/photon'
app.use(binaryMiddleware())
```

### Logger
Standard request/response logging.

```typescript
import { logger } from '@gravito/photon/logger'
app.use(logger())
```

---

## Writing Custom Middleware

Photon middleware follows the classic `(context, next)` pattern.

```typescript
app.use(async (c, next) => {
  console.log(`Before: ${c.req.url}`)
  await next()
  console.log(`After: ${c.res.status}`)
})
```

---

[← Back to README](../README.md)
