---
title: Authorization
description: Learn how to manage user permissions in Gravito using Gates and Policies.
---

# Authorization

Beyond authentication, Gravito provides a robust system for authorizing user actions against specific resources using **Gates** and **Policies**.

## Gates

Gates are simple, closure-based authorization checks, ideal for actions that are not necessarily tied to a specific Model or involve simple logic.

### Defining Gates

You can define Gates during the `boot` phase or within a Service Provider:

```typescript
// src/providers/AuthServiceProvider.ts
export class AuthServiceProvider extends ServiceProvider {
  async boot() {
    const gate = this.container.make('gate');

    gate.define('update-post', (user, post) => {
      return user.id === post.userId;
    });

    gate.define('admin-only', (user) => {
      return user.role === 'admin';
    });
  }
}
```

### Checking Gates

In your controllers or routes, access the Gate via the Context to perform checks:

```typescript
core.app.get('/posts/:id/edit', async (c) => {
  const gate = c.get('gate');
  const post = await Post.find(c.req.param('id'));

  // Check if allowed
  if (await gate.allows('update-post', post)) {
    // Perform logic...
  }

  // Or authorize strictly (throws 403 on failure)
  await gate.authorize('update-post', post);
});
```

## Policies

When authorization logic becomes more complex or you want to organize logic related to a specific Model, use **Policies**.

### Defining Policies

Policies are simple classes with methods often corresponding to controller actions (e.g., `view`, `create`, `update`, `delete`):

```typescript
// src/policies/PostPolicy.ts
export class PostPolicy {
  update(user, post) {
    return user.id === post.userId;
  }

  delete(user, post) {
    return user.role === 'admin' || user.id === post.userId;
  }
}
```

### Registering Policies

Map your Policies to Models in your configuration or Service Provider:

```typescript
gate.policy(Post, PostPolicy);
```

### Checking Policies

Once registered, you can use the same syntax as Gates. Pass the Model instance, and Gravito will automatically resolve the correct Policy:

```typescript
// Gravito automatically calls PostPolicy.update
await c.get('gate').authorize('update', post);
```

## Middleware Authorization

You can also use authorization middleware directly in your route definitions:

```typescript
import { can } from '@gravito/sentinel';

// Only users who can update the post can access this route
routes.get('/posts/:id', can('update-post', 'post'), [PostController, 'show']);
```

---

## Next Steps
Explore the complete [Authentication](./authentication.md) flow.
