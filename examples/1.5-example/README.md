# 🌌 My Gravito App

A web application built with [Gravito](https://github.com/gravito-framework/gravito) - A micro-kernel framework for modular backend applications.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server (with hot reload)
bun run dev

# Start production server
bun run start
```

## Project Structure

```
src/
├── index.ts           # App entry point (configure here)
├── bootstrap.ts       # Framework initialization
├── routes/
│   ├── home.ts        # Page routes (GET /)
│   └── api.ts         # API routes (GET /api/*)
├── hooks/
│   └── index.ts       # Application hooks
├── utils/
│   └── template.ts    # Template engine
└── views/
    ├── layout.html    # Base HTML layout
    └── home.html      # Home page template
```

## Customization

### Add a New Route

Create a new file in `src/routes/`:

```typescript
// src/routes/users.ts
import type { PlanetCore } from 'gravito-core'

export function registerUserRoutes(core: PlanetCore): void {
  core.app.get('/api/users', (c) => {
    return c.json({ users: [] })
  })
}
```

Then register it in `src/bootstrap.ts`:

```typescript
import { registerUserRoutes } from './routes/users'

// In bootstrap function:
registerUserRoutes(core)
```

### Add a Hook

Edit `src/hooks/index.ts`:

```typescript
// Log all requests
core.hooks.addAction('request:start', (args) => {
  console.log(`Request: ${args.method} ${args.path}`)
})
```

### Add a New Page

1. Create `src/views/about.html`
2. In your route, use `render('about', { data }, { title: 'About' })`

## Available Orbits

- `@gravito/orbit-cache` - In-memory caching
- `@gravito/orbit-db` - Database integration
- `@gravito/orbit-auth` - Authentication
- `@gravito/orbit-storage` - File storage

## Learn More

- [Gravito Documentation](https://github.com/gravito-framework/gravito#readme)
- [Hono Documentation](https://hono.dev)
- [Bun Documentation](https://bun.sh)

## License

MIT
