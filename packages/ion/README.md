# 🛰️ Orbit Inertia

> Inertia.js adapter for Gravito. Build modern monoliths with React/Vue.

**Orbit Inertia** allows you to build single-page apps using classic server-side routing and controllers. It acts as the glue between Gravito (Photon) and your frontend framework.

## ✨ Features

- **Server-Side Routing**: Use Gravito's elegant routing and controllers.
- **Client-Side Rendering**: Build your UI with React, Vue, or Svelte.
- **No API required**: Pass data directly from controllers to components as props.
- **SEO Ready**: Compatible with SSR (Server-Side Rendering) patterns since we control the initial page load.

## 📦 Installation

```bash
bun add @gravito/ion
```

## 🚀 Usage

### 1. Register the Orbit

In your `bootstrap.ts`:

```typescript
import { OrbitIon } from '@gravito/ion';
import { OrbitPrism } from '@gravito/prism'; // Required for root template

const config = defineConfig({
  orbits: [OrbitPrism, OrbitIon],
});
```

### 2. Create the Root Template

By default, Inertia looks for `src/views/app.html`. This is the "shell" of your application.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <!-- Include your compiled assets -->
    <script type="module" src="/static/build/assets/index.js"></script>
    <link rel="stylesheet" href="/static/build/assets/index.css">
</head>
<body>
    <!-- The data-page attribute is crucial for Inertia -->
    <div id="app" data-page='{{{ page }}}'></div>
</body>
</html>
```

### 3. Return Responses

In your controllers, simply use `inertia.render()`:

```typescript
import { Context } from '@gravito/photon';
import { InertiaService } from '@gravito/ion';

export class HomeController {
  index = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService;
    
    return inertia.render('Home', {
      user: 'Carl',
      stats: { visits: 100 }
    });
  };
}
```

The `'Home'` string corresponds to your frontend component path (e.g., `src/client/pages/Home.tsx`).

#### Type-Safe Props (TypeScript)

You can use generics for type-safe props:

```typescript
interface HomeProps {
  user: string;
  stats: { visits: number };
}

export class HomeController {
  index = async (c: Context) => {
    const inertia = c.get('inertia') as InertiaService;
    
    return inertia.render<HomeProps>('Home', {
      user: 'Carl',
      stats: { visits: 100 }
    });
  };
}
```

## 🛡️ Error Handling

OrbitIon provides structured error handling with custom error types:

```typescript
import { InertiaError, InertiaErrorCodes } from '@gravito/ion';

try {
  return inertia.render('Dashboard', { data: myData });
} catch (error) {
  if (error instanceof InertiaError) {
    console.error('Inertia Error:', error.code);
    console.error('Details:', error.details);
    
    switch (error.code) {
      case InertiaErrorCodes.CONFIG_VIEW_SERVICE_MISSING:
        // OrbitPrism not loaded
        break;
      case InertiaErrorCodes.SERIALIZATION_FAILED:
        // Props contain circular references or BigInt
        break;
      case InertiaErrorCodes.TEMPLATE_RENDER_FAILED:
        // View template issue
        break;
    }
  }
}
```

## 🔧 Client-Side Setup (React Example)

You need to set up your client entry point (e.g., `src/client/app.tsx`):

```tsx
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

createInertiaApp({
  resolve: name => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true });
    return pages[`./pages/${name}.tsx`];
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});
```

See `templates/inertia-react` for a complete working example with Vite.

## 📝 License

MIT
