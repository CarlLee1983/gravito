---
title: Orbit Pulse (CLI)
---

# Orbit Pulse

The official CLI for scaffolding and managing Gravito projects.

Gravito CLI provides a comprehensive suite of tools to help you build, test, and manage your application, offering an experience similar to Laravel Artisan.

## Installation

```bash
# Global install (recommended)
bun add -g @gravito/pulse

# Or use npx/bunx
bunx @gravito/pulse create my-app
```

## Usage

### Create a New Project

```bash
gravito create [project-name]
```

### Scaffolding (Make Commands)

Generate code quickly using standard templates:

```bash
# Create a Controller
gravito make:controller UserController

# Create a Middleware
gravito make:middleware EnsureAdmin
```

### Development Utilities

```bash
# List all registered routes
gravito route:list

# Start interactive Tinker REPL (with core & container preloaded)
gravito tinker
```

> **Note**: Database management commands (`migrate`, `db:seed`, etc.) and scheduler commands (`schedule:*`) are not available in v1.0. These features will be introduced in future releases.

## Available Templates

| Template | Description |
|----------|-------------|
| `basic` | Minimal setup with PlanetCore + Gravito Core. Great for APIs and simple backends. |
| `inertia-react` | Full-stack monolith with Inertia.js + React + Vite. Build modern SPAs with server-side routing. |

## Development

```bash
# Run locally
bun run dev create my-test-app

# Build binary
bun run build
```

## License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
