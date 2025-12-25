# 🧩 Plugin Development Guide

In the **Galaxy Architecture**, plugins are the celestial bodies that populate your universe. We classify them into two main types:

1.  **Satellites (Logic Extensions)**: Pure logic extensions that use Hooks (Filters/Actions) to modify behavior.
2.  **Orbits (Functional Modules)**: Full-featured modules with their own routes (API endpoints), usually mounted to a specific path.

---

## 🚀 How to Create a Satellite (Logic Plugin)

Satellites interact with the core primarily through the `HookManager`.

### Scenario: A "Profanity Filter" Plugin

```typescript
import { PlanetCore } from 'gravito-core';

export default function profanityFilterPlugin(core: PlanetCore) {
  // Register a filter on the 'content_save' hook
  core.hooks.addFilter('content_save', async (content: string) => {
    return content.replace(/badword/g, '****');
  });
  
  console.log('[Plugin] Profanity Filter loaded.');
}
```

**Usage:**

```typescript
// main.ts
const core = new PlanetCore();
profanityFilterPlugin(core);
```

---

## 🛰️ How to Create an Orbit (Route Plugin)

Orbits are Photon instances that are mounted onto the Core's main router.

### Scenario: A "Blog" Module

```typescript
import { Photon } from '@gravito/photon';
import { PlanetCore } from 'gravito-core';

export default function blogOrbit(core: PlanetCore) {
  const app = new Photon();

  // Define routes
  app.get('/posts', (c) => c.json({ posts: ['Hello World'] }));
  
  // Trigger an action when a post is viewed
  app.get('/posts/:id', async (c) => {
    const id = c.req.param('id');
    await core.hooks.doAction('blog_post_viewed', id);
    return c.json({ id, title: 'Post Title' });
  });

  // Mount the orbit
  core.mountOrbit('/api/blog', app);
  
  console.log('[Orbit] Blog module mounted at /api/blog');
}
```

---

## 🎯 Best Practices

1.  **Naming Conventions**:
    *   Hooks: Use `snake_case` with namespaces, e.g., `blog:post_save`, `auth:login_success`.
    *   Plugins: Allow passing configuration options to your plugin function.

2.  **Type Safety (Advanced)**:
    *   Export interfaces for your Hooks so consumers know what arguments to expect.

3.  **Dependencies**:
    *   Keep plugins lightweight.
    *   Re-use `@gravito/photon` from the peer dependencies if possible.
