---
title: Ion
---

# Ion

> Seamless integration between your Backend MVC and Frontend React/Vue components.

## Installation

```bash
bun add @gravito/ion @inertiajs/react
```

## Setup

Ion is an "Infrastructure Gravito" that mounts automatically if detected in `gravito.config.ts`.

```typescript
// gravito.config.ts
import { OrbitIon } from '@gravito/ion';

export default defineConfig({
    orbits: [OrbitIon],
    config: {
        inertia: {
            rootView: 'app.html',
            version: '4.0'
        }
    }
});
```

## Basic Usage

### Controller

Inject `InertiaService` into your controller via `Context`.

```typescript
// src/controllers/HomeController.ts
import { InertiaService } from '@gravito/ion';

export class HomeController {
    index(c: Context) {
        const inertia = c.get('inertia') as InertiaService;
        
        return inertia.render('Home', {
            user: { name: 'Carl' },
            latest_posts: [] 
        });
    }
}
```

### Frontend (React)

```tsx
// src/client/pages/Home.tsx
interface Props {
    user: { name: string };
    latest_posts: any[];
}

export default function Home({ user, latest_posts }: Props) {
    return (
        <div>
            <h1>Welcome back, {user.name}!</h1>
        </div>
    );
}
```

## Advanced Features

### Shared Data (Middleware)

Share data across all requests (e.g., current user, flash messages).

```typescript
// src/middleware/HandleInertiaRequests.ts
import { InertiaService } from '@gravito/ion';

export const handleInertiaRequests = async (c: Context, next: Next) => {
    const inertia = c.get('inertia') as InertiaService;
    
    inertia.share({
        auth: {
            user: c.get('user')
        },
        flash: c.get('flash')
    });
    
    await next();
};
```

### Head Management

You can manage `<head>` tags in two ways:

1.  **Backend (Recommended for SEO default)**:
    ```typescript
    ctx.meta({ title: 'My App', description: '...' });
    ```
    
2.  **Frontend (Dynamic)**:
    ```tsx
    import { Head } from '@inertiajs/react';
    
    <Head title="My Page Title" />
    ```

> **Warning**: Avoid using `<Head><title>...</title></Head>` as it may cause serialization issues. Use the `title` prop instead.

### Layouts

While Inertia supports Persistent Layouts via `Page.layout = page => <Layout>{page}</Layout>`, we recommend **Component Wrapping** for better type safety and reliability, especially with HMR.

```tsx
// src/client/pages/Home.tsx
export default function Home() {
    return (
        <Layout>
            <Head title="Home" />
            <div>Content...</div>
        </Layout>
    );
}
```

## API Reference

### `InertiaService`

| Method | Description |
|--------|-------------|
| `render(component, props?)` | Render an Inertia page response |
| `share(key, value)` | Share a prop with the current request |
| `location(url)` | Server-side redirect (external) |

### Middleware

Gravito automatically registers the Inertia middleware. It handles:
- Conflict detection (`X-Inertia-Version`)
- Partial reloads (`only` param)
- JSON vs HTML response negotiation
