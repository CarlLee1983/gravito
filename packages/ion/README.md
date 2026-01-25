# 🛰️ Orbit Inertia (Ion)

> Inertia.js adapter for Gravito. Build modern monoliths with React/Vue/Svelte.

**Orbit Inertia** (@gravito/ion) is a high-performance adapter that allows you to build single-page apps using classic server-side routing and controllers. It acts as the "glue" between Gravito (Photon) and your frontend framework, eliminating the need for a separate REST/GraphQL API.

## ✨ Key Features

- **🚀 Modern Monolith Architecture**: Combine the productivity of server-side routing with the interactivity of SPA frameworks.
- **🛠️ Zero API Development**: Pass data directly from controllers to components as typed props—no more managing endpoints or manual serialization.
- **⚡ High-Performance Rendering**: Built-in multi-layer caching for components and metadata, ensuring sub-millisecond overhead.
- **🛡️ Native Type Safety**: Full TypeScript support with generics for props, ensuring end-to-end type safety from server to client.
- **🔗 Ecosystem Integration**: Seamlessly works with `OrbitPrism` for root templates and Gravito's session/auth modules.
- **🔍 SEO & SSR Friendly**: Designed for modern web requirements, supporting Server-Side Rendering patterns for optimal visibility.
- **🎨 Multi-Framework Support**: Official support for **React**, **Vue**, and **Svelte**.

## 📦 Installation

```bash
bun add @gravito/ion
```

## 🚀 Quick Start

### 1. Register the Orbit

In your application bootstrap:

```typescript
import { OrbitIon } from '@gravito/ion';
import { OrbitPrism } from '@gravito/prism'; // Required for the base HTML template

const config = defineConfig({
  orbits: [OrbitPrism, OrbitIon],
});
```

### 2. Configure the Root Template

By default, Ion looks for `src/views/app.html`. Use the `{{{ page }}}` placeholder to inject the Inertia data:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="module" src="/static/assets/app.js"></script>
    <link rel="stylesheet" href="/static/assets/app.css">
</head>
<body>
    <div id="app" data-page='{{{ page }}}'></div>
</body>
</html>
```

### 3. Return Responses from Controllers

Use the `InertiaService` provided in the context:

```typescript
import { Context } from '@gravito/photon';
import { InertiaService } from '@gravito/ion';

export class DashboardController {
  index = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService;
    
    return inertia.render('Dashboard/Index', {
      user: c.get('user'),
      stats: { activeOrders: 5 }
    });
  };
}
```

## 🔧 Advanced Features

### Shared Props
Automatically share data with every Inertia response (e.g., auth user, flash messages):

```typescript
inertia.share('auth', { user: 'Carl' });
```

### Partial Reloads
Ion supports Inertia's partial reloads, allowing the client to request only specific data to save bandwidth.

### Manual Serialization Control
Customize how your data is converted to JSON for the client:

```typescript
inertia.render('ProductDetail', {
  product: product.toShortArray() // Explicit control
});
```

## 🛡️ Performance & Reliability

### Benchmarks (Internal)
| Operation | Latency |
|-----------|---------|
| Response Generation | < 0.2ms |
| Template Injection | < 0.1ms |
| Props Serialization | Optimized LRU Caching |

### Error Codes
Ion provides detailed error types via `InertiaErrorCodes`:
- `CONFIG_VIEW_SERVICE_MISSING`: Ensure `OrbitPrism` is loaded.
- `SERIALIZATION_FAILED`: Circular dependencies detected in props.
- `TEMPLATE_RENDER_FAILED`: The base HTML template could not be found or parsed.

## 📝 License

MIT © Carl Lee
