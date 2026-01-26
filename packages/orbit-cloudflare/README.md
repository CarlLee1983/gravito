# @gravito/orbit-cloudflare 🌩️

Cloudflare Workers integration for Gravito Core. This module provides a seamless way to use Cloudflare Workers' unique features (KV, R2, D1, etc.) within the Gravito ecosystem.

## 🌟 Overview

`OrbitCloudflare` is an "Infrastructure Orbit" that bridges the Cloudflare Workers runtime with the Gravito Micro-Kernel. It automatically maps Cloudflare Environment Bindings to the Gravito context, allowing you to build edge-native applications with ease.

## 🚀 Features

- **Automatic Binding Mapping**: Automatically injects all Cloudflare environment bindings (KV, R2, D1, Secret variables, etc.) into the `ctx` object.
- **Unified Context Access**: Access your bindings anywhere via `ctx.get('BINDING_NAME')`.
- **Type-Safe Bindings**: Provides utility types to integrate Cloudflare bindings into Gravito's type system.
- **Cloudflare Native Handler**: Simplified factory to create Cloudflare Worker entry points.

## 📦 Installation

```bash
bun add @gravito/orbit-cloudflare
```

## 🛠️ Usage

### 1. Register the Orbit

Add `OrbitCloudflare` to your Gravito application to enable binding injection.

```typescript
import { Gravito } from '@gravito/core'
import { OrbitCloudflare } from '@gravito/orbit-cloudflare'

const app = new Gravito()

// Register the orbit
app.orbit(OrbitCloudflare)
```

### 2. Define Type-Safe Bindings

Extend the `GravitoVariables` interface to get full IDE support for your Cloudflare bindings.

```typescript
import { CloudflareBindings } from '@gravito/orbit-cloudflare'

declare module '@gravito/core' {
  interface GravitoVariables extends CloudflareBindings<{
    MY_KV: KVNamespace;
    S3_BUCKET: R2Bucket;
    DB: D1Database;
    SECRET_KEY: string;
  }> {}
}
```

### 3. Access Bindings in Routes

```typescript
app.get('/data', async (ctx) => {
  const kv = ctx.get('MY_KV')
  const data = await kv.get('user_1')
  return ctx.json({ data })
})
```

### 4. Export the Worker Handler

Use the `handle` factory to export the default object required by Cloudflare Workers.

```typescript
import { handle } from '@gravito/orbit-cloudflare'

export default handle(app)
```

## 📑 API Reference

### `OrbitCloudflare`
The core orbit object that manages lifecycle and middleware registration.

### `handle(app: Gravito, options?: CloudflareOptions)`
A factory function that returns a Cloudflare-compatible fetch handler.

### `type CloudflareBindings<T>`
A helper type to map your environment variables to Gravito's internal state.

---

## 🤝 License

MIT © Carl Lee
