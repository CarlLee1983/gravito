---
title: Routing & Controllers
description: Handling requests with elegance and precision.
---

# 🛣 Routing & Controllers

Gravito combines high-performance routing with the structured development of **MVC** (Model-View-Controller). The HTTP abstraction layer ensures your code is future-proof and engine-agnostic.

## 🚦 The Router

Routes are defined in `src/routes/index.ts`. Gravito provides a fluent API to map URLs to actions.

### Basic Routing

```typescript
// src/routes/index.ts
import type { GravitoContext } from 'gravito-core'
import { HomeController } from '../controllers/HomeController'

export default function(routes: Router) {
  // Simple callback
  routes.get('/hello', (ctx: GravitoContext) => ctx.text('Hello World'))

  // Mapping to a Controller
  routes.get('/', [HomeController, 'index'])
}
```

### Route Groups
Group related routes to apply common prefixes or middleware.

```typescript
routes.group({ prefix: '/api' }, (group) => {
  group.get('/users', [UserController, 'list'])
  group.get('/posts', [PostController, 'list'])
})
```

---

## 🧠 Controllers

Controllers are the "Brains" of your application. Instead of writing all logic in one massive route file, you encapsulate them in classes.

### Anatomy of a Controller

```typescript
// src/controllers/UserController.ts
import type { GravitoContext } from 'gravito-core'

export class UserController {
  /**
   * List all users
   * @param ctx Gravito Context
   */
  async list(ctx: GravitoContext) {
    // 1. Get services from the container
    const userService = ctx.get('userService')
    
    // 2. Perform business logic
    const users = await userService.all()

    // 3. Return a response
    return ctx.json({ data: users })
  }
}
```

### Accessing Services
The `GravitoContext` object is your gateway to the Gravito ecosystem. Use `ctx.get()` to access Orbits and services:
- `ctx.get('inertia')`: The Inertia bridge.
- `ctx.get('view')`: The Template engine.
- `ctx.get('seo')`: The SEO metadata manager.
- `ctx.get('session')`: Session management.
- `ctx.get('auth')`: Authentication manager.

---

## 📦 Handling Responses

A Controller method must return a standard `Response`. Gravito/Hono makes this easy:

| Type | Method | Description |
|------|--------|-------------|
| **JSON** | `ctx.json(data)` | Ideal for APIs. |
| **HTML** | `ctx.html(string)` | Returns raw HTML strings. |
| **Inertia** | `inertia.render(name, props)` | Returns a full-stack React view. |
| **View** | `view.render(name, data)` | Returns a server-rendered template. |
| **Redirect**| `ctx.redirect(url)` | Sends the user elsewhere. |

---

## 🛡 Middleware

Middleware allows you to intercept requests before they reach your controller (e.g., for logging or auth).

```typescript
// Applying middleware to a group
routes.group({ middleware: [logger()] }, (group) => {
  group.get('/dashboard', [DashboardController, 'index'])
})
```

> **Next Step**: Learn how to bridge your backend logic with a modern frontend in our [Inertia Guide](/docs/guide/inertia-react).
