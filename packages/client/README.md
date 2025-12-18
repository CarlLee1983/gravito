# @gravito/client

A lightweight, type-safe HTTP client wrapper for Gravito framework applications. It provides an experience similar to tRPC but uses standard Hono app types.

## Features

- **Zero-Config Type Safety**: Automatically infers types from your backend `AppType`.
- **IntelliSense Support**: Full autocomplete for routes, methods, request bodies, and response data.
- **Lightweight**: A thin wrapper around `hono/client` (< 1kb).

## Installation

```bash
bun add @gravito/client
```

## Quick Start

### 1. In your Backend (Server)

Export the type of your specialized Hono app instance.

```typescript
// server/app.ts
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const app = new Hono()
  .get('/hello', (c) => c.json({ message: 'Hello World' }))
  .post(
    '/posts', 
    zValidator('json', z.object({ title: z.string() })),
    (c) => c.json({ id: 1, ...c.req.valid('json') })
  )

export type AppType = typeof app
export default app
```

### 2. In your Frontend (Client)

Import the type only (no runtime code imported from server) and create the client.

```typescript
// client/api.ts
import { createGravitoClient } from '@gravito/client'
import type { AppType } from '../server/app' // Import Type Only!

const client = createGravitoClient<AppType>('http://localhost:3000')

// Usage
// 1. Fully typed GET request
const res = await client.hello.$get()
const data = await res.json() // { message: string }

// 2. Fully typed POST request with validation
const postRes = await client.posts.$post({
    json: { title: 'Gravito Rocks' } // Type checked!
})
```

## API Reference

### `createGravitoClient<T>(baseUrl, options?)`

- **T**: The generic type parameter representing your Hono app (`AppType`).
- **baseUrl**: The root URL of your API server.
- **options**: Optional `RequestInit` object (headers, etc.).

```typescript
const client = createGravitoClient<AppType>('https://api.example.com', {
  headers: {
    'Authorization': 'Bearer ...'
  }
})
```
