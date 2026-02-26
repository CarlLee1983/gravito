---
title: Middleware
description: Master the request lifecycle filters of the Gravito Galaxy. Learn how to define, register, and leverage middleware within Domain Satellites.
---

# 🛡️ Middleware

Middleware provides a powerful mechanism for inspecting, filtering, and enhancing HTTP requests entering your application. They execute **before** the request reaches the route handler and can also perform cleanup logic **after** the response is returned to the client.

In Gravito v1.6+'s Galaxy Architecture, middleware is not just a filter but a core component for cross-satellite communication and resource injection.

---

## 🏗️ Defining Middleware

A middleware is an asynchronous function that receives a `GravitoContext` and a `GravitoNext` function.

```typescript
import { GravitoMiddleware } from '@gravito/core';

export const requestLogger: GravitoMiddleware = async (c, next) => {
  const start = Date.now();
  
  // 1. Before logic
  console.log(`[REQUEST] ${c.req.method} ${c.req.path}`);

  // 2. Pass to the next middleware or handler
  await next();
  
  // 3. After logic
  const ms = Date.now() - start;
  console.log(`[RESPONSE] ${c.req.path} - ${ms}ms`);
};
```

---

## 🚀 Applying in Domain Satellites (MDD Mode)

In the latest **Manifest-Driven Development (MDD)** mode, we recommend using middleware declaratively within the satellite's `manifest.json`.

### 1. Register Middleware Identifiers
First, register named middleware in the Galaxy Host (`src/bootstrap.ts`) via **Xenon**:

```typescript
// src/bootstrap.ts
const setLocale = (locale: string) => async (c, next) => {
  c.set('locale', locale);
  await next();
};

xenon.registerMiddlewares({
  'setLocale:zh': setLocale('zh'),
  'setLocale:en': setLocale('en'),
});
```

### 2. Reference in Manifest
Then, use these tags directly in the satellite's `manifest.json`:

```json
{
  "name": "SiteDocs",
  "routes": [
    { 
      "path": "/en/docs/*", 
      "method": "GET", 
      "handler": "DocsController@show", 
      "middleware": ["setLocale:en"] 
    }
  ]
}
```

---

## 🛡️ Real-world Usage: Resilience (Guardian Layer)

Using the middleware provided by `@gravito/resilience`, you can protect specific APIs with a **Circuit Breaker**:

```typescript
import { resilience } from '@gravito/resilience';

// Protect API requests to prevent database failures from taking down the entire satellite
router.prefix('/api').middleware(resilience()).group((api) => {
  api.get('/stats', [ApiController, 'stats']);
});
```

---

## 📥 Resource Injection & Context Sharing

The most common use for middleware is injecting objects into the `Context` for subsequent handlers.

```typescript
// Auth Guard Middleware
export const authGuard: GravitoMiddleware = async (c, next) => {
  const token = c.req.header('Authorization');
  const user = await verifyToken(token);

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Inject user info into context
  c.set('user', user);
  await next();
};

// Usage in Controller
export class ProfileController {
  show = async (c) => {
    const user = c.get('user'); // Retrieve injected user info
    return c.json(user);
  }
}
```

---

## 🌍 Global Middleware

To execute logic for **all** requests (including static assets), register it at the adapter level:

```typescript
// src/bootstrap.ts
core.adapter.useGlobal(async (c, next) => {
  c.header('X-Powered-By', 'Gravito Galaxy');
  await next();
});
```

---

## 🔗 Built-in Middleware

Gravito ecosystem provides several out-of-the-box middleware:

| Tag | Package | Description |
| :--- | :--- | :--- |
| `rateLimit` | `@gravito/photon` | Smart rate limiting with IP and UserID support |
| `jwt` | `@gravito/photon` | High-performance JWT signing and verification |
| `cors` | `@gravito/photon` | Flexible Cross-Origin Resource Sharing management |
| `cache` | `@gravito/stasis` | Response-level automatic caching |
| `shield` | `@gravito/fortify` | Advanced XSS and SQL injection protection |

---

## 💡 Best Practices

1.  **Order Matters**: Middleware executes in the order they are registered. Typically: `logger` -> `auth` -> `resilience` -> business logic.
2.  **Avoid Blocking**: Keep middleware lightweight. Offload time-consuming tasks (e.g., sending emails) to `@gravito/stream` asynchronously.
3.  **Error Handling**: Errors within middleware are automatically caught by the `ErrorHandler`. You can also return a response (e.g., `c.json()`) to terminate the chain early.
