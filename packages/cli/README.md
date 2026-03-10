---
title: Orbit Pulse (CLI)
---

# Orbit Pulse

The official CLI for scaffolding and managing Gravito projects.

> **📝 Package Note**: This folder is `packages/cli`, but the published npm package is named `@gravito/pulse`. This is intentional—Pulse is the CLI's role as the beating heart of your Gravito projects.

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
# Interactive mode (recommended)
gravito create [project-name]

# Quick create with template
gravito create my-app --template basic
gravito create my-app --template inertia-react
gravito create my-app --template static-site
```

When using the `static-site` template, you'll be prompted to choose between React, Vue, or Svelte for the frontend framework.

### Scaffolding (Make Commands)

Generate code quickly using standard templates:

```bash
# Create a Controller
gravito make:controller UserController

# Create a Middleware
gravito make:middleware EnsureAdmin

# Create a Command
gravito make:command GreetCommand
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
| `static-site` | Pre-configured static site generator for GitHub Pages, Vercel, Netlify. Supports React, Vue, or Svelte. Perfect for documentation sites, blogs, and marketing pages. |

## Development

```bash
# Run locally
bun run dev create my-test-app

# Build binary
bun run build
```

## License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
