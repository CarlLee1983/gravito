---
title: Quick Start
description: Build your first route and controller in 5 minutes.
---

# Quick Start

> Already installed Gravito? Let’s ship your first route and controller.

## Your First Route

Routes live in `src/routes/web.ts` (or `api.ts`). The API is clean and chainable.

```typescript
import { Route } from '@gravito/core'

Route.get('/hello', () => 'Hello Gravito!')
```

## Use a Controller

As logic grows, move it into controllers. Generate one with the CLI:

```bash
bun gravito make:controller UserController
```

Define the handler in `src/controllers/UserController.ts`:

```typescript
import { Context } from '@gravito/core'

export class UserController {
  async index(c: Context) {
    return c.json({ message: 'Hello from controller' })
  }
}
```

Register it in `src/routes/web.ts`:

```typescript
import { UserController } from '../controllers/UserController'

Route.get('/users', [UserController, 'index'])
```

## Three Rendering Paths

Gravito lets you switch modes per page:

### A. Fullstack SPA (Inertia.js + React/Vue)
```ts
index(c: Context) {
  const inertia = c.get('inertia')
  return inertia.render('UserProfile', { name: 'John Doe' })
}
```

### B. Classic MPA (Template Engine)
```ts
index(c: Context) {
  const view = c.get('view')
  return view.render('welcome', { title: 'My Site' })
}
```

### C. Lightweight API Only
```ts
index(c: Context) {
  return c.json({ status: 'ok' })
}
```

## Database & Migrations

Gravito ships with **Atlas ORM**. Create and run migrations with:

```bash
bun gravito migrate
bun gravito make:migration create_posts_table
```

> Tip: See the [ORM Usage Guide](./orm-usage.md) for full database docs.

## Tinker (Interactive REPL)

```bash
bun gravito tinker
```

---

## Next Steps
- Dive into [Core Concepts](./core-concepts.md).
- Explore advanced [Routing](./routing.md).
