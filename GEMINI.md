# GEMINI.md

## 🌌 Project Overview: Gravito Framework

Gravito is a modular, high-performance TypeScript framework built for the modern web, leveraging the **Galaxy Architecture**. It strictly enforces **Domain-Driven Design (DDD)** and **Clean Architecture** internally while providing a minimalist, **Manifest-Driven Development (MDD)** experience for developers.

### Core Architectural Pillars
- **PlanetCore (Micro-Kernel)**: A self-developed, ultra-lightweight engine managing hooks, IoC containers, and lifecycle events (`@gravito/core`).
- **Orbits (Infrastructure)**: Strategic extensions that provide essential resources like Database (Atlas ORM), Auth, and Messaging.
- **Satellites (Domain Plugins)**: Self-contained business units (Catalog, Membership, Commerce) that implement specific domains using Clean Architecture.

### Key Technologies
- **Runtime**: [Bun](https://bun.sh/) v1.3.9 (Package manager, test runner, script execution).
- **Monorepo Management**: [TurboRepo](https://turbo.build/).
- **Linting & Formatting**: [Biome](https://biomejs.dev/) v2.3.10.
- **Web Engines**: [Hono](https://hono.dev/) (via `@gravito/photon`), [Elysia](https://elysiajs.com/).
- **Data Layer**: Atlas ORM (`@gravito/atlas`) v1.1.0+.
- **Communication**: Signal Event Bus (`@gravito/signal`).

---

## 🛠️ Building and Running

The project is a monorepo managed by Bun and Turbo. Key commands are accessible from the root `package.json`.

| Task | Command | Description |
|---|---|---|
| **Build** | `bun run build` | Build all packages and satellites via Turbo. |
| **Test** | `bun run test` | Run all tests using Bun's native test runner. |
| **Typecheck** | `bun run typecheck` | Run `bun tsc` in `noEmit` mode across the monorepo. |
| **Lint/Format** | `bun run check` | Run Biome lint and format checks. |
| **Fix Lint** | `bun run check:fix` | Automatically fix linting and formatting issues. |
| **Launchpad** | `bun run launchpad:up` | Start the Gravito Launchpad (Development Dashboard). |
| **CI Simulation**| `bun run ci:simulate` | Run local CI simulation to verify changes before pushing. |

---

## 📏 Development Conventions

### TypeScript & Type Safety
- **Compiler Consistency**: All packages must use TypeScript v5.9.3 (workspace version).
- **Type Isolation**: 
    - **Backend/Core**: MUST include `bun-types` in `tsconfig.json` and `devDependencies`.
    - **Frontend**: MUST NOT include `bun-types` to avoid global DOM/namespace conflicts. Use `bun tsc` for typechecking.
- **Strict Mode**: `noUnusedLocals` and `noUnusedParameters` are mandatory. Avoid `@ts-ignore` without explanation.

### Data Layer (Atlas 1.1.0+)
- **Manual Drivers**: Database drivers (e.g., `pg`, `mysql2`, `mongodb`) are now `peerDependencies`. They MUST be installed manually in the consumer project.
- **Decorator Support**: Packages using Atlas decorators require `@swc/core` in `devDependencies` to prevent build-time metadata warnings.
- **Mocking**: Drivers support constructor dependency injection (e.g., `deps.MongoClient`) for testing.

### Architectural Rules
- **Satellite Isolation**: Satellites must NOT import from each other directly. Use the `@gravito/signal` event bus.
- **Static Site Detection**: Domain matching (e.g., `gravito.dev`, `*.gravito.dev`) must identify static sites early to prevent Inertia AJAX requests and 500 errors.
- **Circular Dependencies**: Strictly forbidden. Use `bun run scripts/generate-dependency-graph.ts` for diagnosis.

### CI & Performance
- **OOM Prevention**: CI workflows (GitHub Actions) are limited to a concurrency of 2 (`turbo --concurrency=2`).
- **Validation**: Always run `bun run ci:simulate` before pushing significant changes.

---

## 📚 Reference Documentation
- **[README.md](./README.md)**: General project overview.
- **[AGENT.md](./AGENT.md)**: Comprehensive AI agent instructions and package maps.
- **[docs/README.md](./docs/README.md)**: Documentation hub and index.
- **[docs/claude/commands.md](./docs/claude/commands.md)**: Detailed CLI command reference.
- **[docs/TECH_HIGHLIGHTS.md](./docs/TECH_HIGHLIGHTS.md)**: Technical value propositions.
