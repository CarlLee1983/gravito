---
title: Gravito CLI
---

# Gravito CLI

The official CLI for scaffolding and managing Gravito projects.

Gravito CLI provides a comprehensive suite of tools to help you build, test, and manage your application, offering an experience similar to Laravel Artisan.

## Installation

```bash
# Global install (recommended)
bun add -g @gravito/cli

# Or use npx/bunx
bunx @gravito/cli create my-app
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

# Create a Model
gravito make:model User

# Create a Middleware
gravito make:middleware EnsureAdmin

# Create a Migration
gravito make:migration create_users_table

# Create a Seeder
gravito make:seeder UserSeeder
```

### Database Management

Manage your database migrations and seeders (wraps `drizzle-kit`):

```bash
# Run pending migrations
gravito migrate

# Drop all tables and re-run migrations
gravito migrate --fresh

# Check migration status
gravito migrate:status

# Run database seeders
gravito db:seed
gravito db:seed --class UserSeeder
```

### Development Utilities

```bash
# List all registered routes
gravito route:list

# Start interactive Tinker REPL (with core & container preloaded)
gravito tinker
```

### Scheduler Commands

Manage scheduled tasks in your application:

```bash
# List all scheduled tasks
gravito schedule:list

# Run due tasks (for cron integration)
gravito schedule:run

# Run scheduler in daemon mode
gravito schedule:work
```

## Available Templates

| Template | Description |
|----------|-------------|
| `basic` | Minimal setup with PlanetCore + Hono. Great for APIs and simple backends. |
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
