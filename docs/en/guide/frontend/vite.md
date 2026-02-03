---
title: Asset Bundling
description: Learn how Gravito integrates Vite for bundling and HMR.
---

# Asset Bundling

Gravito integrates **Vite** for lightning-fast HMR and production-optimized builds.

## Project Structure

In a standard Gravito fullstack app, frontend code lives in `src/client`:

```text
src/client/
├── components/
├── pages/
├── app.ts
└── style.css
```

## Development Mode

When you run `bun dev`, Gravito starts:
1. **Gravito backend** to handle requests.
2. **Vite dev server** for live compilation and HMR.

Gravito proxies Vite so you only access one port (default 3000).

## Include Assets

### In Templates (MVC/MPA)

```html
<!-- src/views/welcome.hbs -->
<head>
  {{ vite_client }}
  {{ vite_assets "src/client/app.ts" }}
</head>
```

### In Inertia.js

If you use `Ion` (Inertia bridge), this is automatic. Define your component paths and Gravito handles the rest.

## Production Build

```bash
bun build
```

This runs `vite build` and outputs optimized files to `dist/client`. Backend code is compiled to `dist` as well.

### Config: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { gravito } from '@gravito/core/vite';

export default defineConfig({
  plugins: [
    gravito({
      input: 'src/client/app.ts',
      ssr: 'src/client/ssr.ts',
    }),
  ],
});
```

---

## Next Steps
Read [Inertia React](./inertia-react.md) to build fullstack SPA pages.
